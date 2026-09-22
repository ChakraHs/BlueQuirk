package shop.bluequirk.blue_quirk_backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.analytics.support.DateRange;
import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.dto.OrderTimeseriesResponse;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository.OrderDateStatus;

/**
 * Read-only order aggregations for the admin dashboard. Kept separate from the
 * (large) {@link OrderService} so the chart logic and its tests stay focused.
 *
 * <p>The orders-over-time series buckets orders by day / week / month over a
 * {@link DateRange} window and <b>zero-fills</b> every period in range so days
 * (or weeks/months) with no orders still appear on the chart. Bucketing is done in
 * Java (not SQL) so it stays database-agnostic and easy to unit-test.
 */
@Service
public class OrderStatsService {

    public enum Granularity { DAY, WEEK, MONTH }

    private final OrderRepository orders;

    public OrderStatsService(OrderRepository orders) {
        this.orders = orders;
    }

    public static Granularity parseGranularity(String raw) {
        if (raw == null) return Granularity.DAY;
        return switch (raw.trim().toLowerCase()) {
            case "week", "weekly", "w" -> Granularity.WEEK;
            case "month", "monthly", "m" -> Granularity.MONTH;
            default -> Granularity.DAY;
        };
    }

    @Transactional(readOnly = true)
    public OrderTimeseriesResponse timeseries(DateRange range, Granularity granularity) {
        LocalDate start = range.fromLocal().toLocalDate();
        LocalDate endExclusive = range.toLocal().toLocalDate();

        // Pre-seed every period in range with zero counts, in chronological order.
        Map<String, long[]> byPeriod = new LinkedHashMap<>();
        for (String key : periodKeys(start, endExclusive, granularity)) {
            byPeriod.put(key, new long[6]); // all, pending, confirmed, shipped, delivered, cancelled
        }

        // Tally the actual orders into their bucket.
        List<OrderDateStatus> rows = orders.findDateStatusBetween(range.fromLocal(), range.toLocal());
        for (OrderDateStatus row : rows) {
            if (row.getOrderDate() == null) continue;
            String key = periodKey(row.getOrderDate().toLocalDate(), granularity);
            long[] c = byPeriod.get(key);
            if (c == null) { // defensive — an order exactly on the boundary
                c = new long[6];
                byPeriod.put(key, c);
            }
            c[0]++;
            int idx = statusIndex(row.getStatus());
            if (idx > 0) c[idx]++;
        }

        List<OrderTimeseriesResponse.Bucket> buckets = new ArrayList<>(byPeriod.size());
        for (Map.Entry<String, long[]> e : byPeriod.entrySet()) {
            long[] c = e.getValue();
            buckets.add(new OrderTimeseriesResponse.Bucket(
                    e.getKey(), c[0], c[1], c[2], c[3], c[4], c[5]));
        }

        return new OrderTimeseriesResponse(
                granularity.name().toLowerCase(),
                start.toString(),
                endExclusive.toString(),
                buckets);
    }

    /** Column index in the counts array for a status (0 = "all" only, no own column). */
    private int statusIndex(OrderStatus status) {
        if (status == null) return 0;
        return switch (status) {
            case PENDING -> 1;
            case CONFIRMED -> 2;
            case SHIPPED -> 3;
            case DELIVERED -> 4;
            case CANCELLED -> 5;
            default -> 0;
        };
    }

    /** The bucket key a given day falls into for the chosen granularity. */
    private String periodKey(LocalDate day, Granularity g) {
        return switch (g) {
            case DAY -> day.toString();
            case WEEK -> weekStart(day).toString();
            case MONTH -> YearMonth.from(day).toString(); // "yyyy-MM"
        };
    }

    /** Every ordered bucket key covering [start, endExclusive) for the granularity. */
    private List<String> periodKeys(LocalDate start, LocalDate endExclusive, Granularity g) {
        List<String> keys = new ArrayList<>();
        if (!start.isBefore(endExclusive)) return keys;
        switch (g) {
            case DAY -> {
                for (LocalDate d = start; d.isBefore(endExclusive); d = d.plusDays(1)) {
                    keys.add(d.toString());
                }
            }
            case WEEK -> {
                for (LocalDate w = weekStart(start); w.isBefore(endExclusive); w = w.plusWeeks(1)) {
                    keys.add(w.toString());
                }
            }
            case MONTH -> {
                YearMonth end = YearMonth.from(endExclusive.minusDays(1));
                for (YearMonth ym = YearMonth.from(start); !ym.isAfter(end); ym = ym.plusMonths(1)) {
                    keys.add(ym.toString());
                }
            }
        }
        return keys;
    }

    /** Monday of the ISO week containing {@code day}. */
    private LocalDate weekStart(LocalDate day) {
        return day.minusDays(day.getDayOfWeek().getValue() - 1L);
    }
}
