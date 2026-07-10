package shop.bluequirk.blue_quirk_backend.finance.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.finance.dto.FinanceSummary;
import shop.bluequirk.blue_quirk_backend.finance.dto.FinanceTimePoint;
import shop.bluequirk.blue_quirk_backend.finance.dto.ProductFinancialRow;
import shop.bluequirk.blue_quirk_backend.finance.repository.FinanceReportRepository;

/**
 * Builds every admin finance report (summary KPIs, time series, product
 * rankings) from immutable order snapshots. All arithmetic is delegated to
 * {@link FinancialCalculationService} so the definitions of profit, margin, net
 * sales and operational revenue live in exactly one place and future reports
 * reuse them verbatim.
 */
@Service
public class FinanceReportService {

    /** Metric a product ranking can be sorted by. */
    public enum ProductRanking { UNITS, PROFIT, MARGIN, REVENUE }

    /** Time-series bucket granularity. */
    public enum Granularity { DAY, MONTH }

    private final FinanceReportRepository repository;
    private final FinancialCalculationService finance;

    public FinanceReportService(FinanceReportRepository repository,
                                FinancialCalculationService finance) {
        this.repository = repository;
        this.finance = finance;
    }

    /** Aggregated KPIs for an explicit half-open window [from, to). */
    @Transactional(readOnly = true)
    public FinanceSummary summary(LocalDateTime from, LocalDateTime to) {
        List<Object[]> rows = repository.summaryRow(from, to);
        Object[] r = rows.isEmpty() ? new Object[6] : rows.get(0);

        long orders = lng(r[0]);
        double revenue = finance.round(num(r[1]));
        double cost = finance.round(num(r[2]));
        double discount = finance.round(num(r[3]));
        double shipping = finance.round(num(r[4]));
        double collected = finance.round(num(r[5]));
        long units = repository.sumUnits(from, to);

        return new FinanceSummary(
                from.toString(),
                to.toString(),
                revenue,
                cost,
                finance.grossProfit(revenue, cost),
                finance.marginPercent(revenue, cost),
                finance.netSales(revenue, discount),
                finance.operationalRevenue(revenue, shipping),
                discount,
                shipping,
                collected,
                orders,
                units,
                finance.averageOrderValue(collected, orders)
        );
    }

    /** A financial time series between two dates, bucketed daily or monthly. */
    @Transactional(readOnly = true)
    public List<FinanceTimePoint> timeSeries(LocalDateTime from, LocalDateTime to, Granularity granularity) {
        List<Object[]> rows = granularity == Granularity.MONTH
                ? repository.monthlyFinancials(from, to)
                : repository.dailyFinancials(from, to);
        return rows.stream().map(r -> {
            double revenue = finance.round(num(r[2]));
            double cost = finance.round(num(r[3]));
            return new FinanceTimePoint(
                    str(r[0]),
                    lng(r[1]),
                    revenue,
                    cost,
                    finance.grossProfit(revenue, cost),
                    finance.marginPercent(revenue, cost));
        }).toList();
    }

    /**
     * Products ranked by the requested metric within the window. Descending for
     * units/profit/revenue (biggest first); ascending for margin (lowest-margin
     * first, restricted to products that actually sold). {@code limit} caps size.
     */
    @Transactional(readOnly = true)
    public List<ProductFinancialRow> topProducts(LocalDateTime from, LocalDateTime to,
                                                 ProductRanking metric, int limit) {
        List<ProductFinancialRow> rows = repository.productFinancials(from, to).stream()
                .map(r -> {
                    double revenue = finance.round(num(r[3]));
                    double cost = finance.round(num(r[4]));
                    double profit = finance.round(num(r[5]));
                    return new ProductFinancialRow(
                            r[0] == null ? null : lng(r[0]),
                            str(r[1]),
                            lng(r[2]),
                            revenue,
                            cost,
                            profit,
                            finance.marginPercent(revenue, cost));
                })
                .toList();

        Comparator<ProductFinancialRow> comparator = switch (metric) {
            case UNITS   -> Comparator.comparingLong(ProductFinancialRow::unitsSold).reversed();
            case PROFIT  -> Comparator.comparingDouble(ProductFinancialRow::profit).reversed();
            case REVENUE -> Comparator.comparingDouble(ProductFinancialRow::revenue).reversed();
            case MARGIN  -> Comparator.comparingDouble(ProductFinancialRow::marginPercent);
        };

        return rows.stream()
                // Lowest-margin only makes sense for products with sales.
                .filter(p -> metric != ProductRanking.MARGIN || p.unitsSold() > 0)
                .sorted(comparator)
                .limit(Math.max(1, limit))
                .toList();
    }

    // ---- Preset windows (server-side so every client agrees on "today") ------

    /** [start-of-today, now-ish end-of-day). */
    public LocalDateTime[] today() {
        LocalDate d = LocalDate.now();
        return new LocalDateTime[]{ d.atStartOfDay(), d.plusDays(1).atStartOfDay() };
    }

    /** [first day of this month, first day of next month). */
    public LocalDateTime[] thisMonth() {
        LocalDate first = LocalDate.now().withDayOfMonth(1);
        return new LocalDateTime[]{ first.atStartOfDay(), first.plusMonths(1).atStartOfDay() };
    }

    /** [first day of this year, first day of next year). */
    public LocalDateTime[] thisYear() {
        LocalDate first = LocalDate.now().withDayOfYear(1);
        return new LocalDateTime[]{ first.atStartOfDay(), first.plusYears(1).atStartOfDay() };
    }

    // ---- Native-result coercion (drivers return BigDecimal/BigInteger/Long) --

    private static double num(Object o) {
        return o == null ? 0.0 : ((Number) o).doubleValue();
    }

    private static long lng(Object o) {
        return o == null ? 0L : ((Number) o).longValue();
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }
}
