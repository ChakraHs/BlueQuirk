package shop.bluequirk.blue_quirk_backend.finance.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.finance.dto.FinanceOverview;
import shop.bluequirk.blue_quirk_backend.finance.dto.FinanceSummary;
import shop.bluequirk.blue_quirk_backend.finance.dto.FinanceTimePoint;
import shop.bluequirk.blue_quirk_backend.finance.dto.ProductFinancialRow;
import shop.bluequirk.blue_quirk_backend.finance.service.FinanceReportService;
import shop.bluequirk.blue_quirk_backend.finance.service.FinanceReportService.Granularity;
import shop.bluequirk.blue_quirk_backend.finance.service.FinanceReportService.ProductRanking;

/**
 * Admin finance & profit analytics API. Everything under {@code /api/admin/**}
 * is admin-only (SecurityConfig fail-closed), so these confidential figures are
 * never reachable by the storefront. Date params are inclusive calendar dates
 * (YYYY-MM-DD); the service converts them to a half-open day window.
 */
@RestController
@RequestMapping("/api/admin/finance")
public class FinanceController {

    private final FinanceReportService reports;

    public FinanceController(FinanceReportService reports) {
        this.reports = reports;
    }

    /** KPIs for Today / This Month / This Year in one call (dashboard header). */
    @GetMapping("/overview")
    public ResponseEntity<FinanceOverview> overview() {
        LocalDateTime[] d = reports.today();
        LocalDateTime[] m = reports.thisMonth();
        LocalDateTime[] y = reports.thisYear();
        return ResponseEntity.ok(new FinanceOverview(
                reports.summary(d[0], d[1]),
                reports.summary(m[0], m[1]),
                reports.summary(y[0], y[1])
        ));
    }

    /** KPIs for an explicit date range; defaults to the current month. */
    @GetMapping("/summary")
    public ResponseEntity<FinanceSummary> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from == null || to == null) {
            LocalDateTime[] m = reports.thisMonth();
            return ResponseEntity.ok(reports.summary(m[0], m[1]));
        }
        return ResponseEntity.ok(reports.summary(from.atStartOfDay(), to.plusDays(1).atStartOfDay()));
    }

    /** Revenue / profit / orders over time (daily or monthly buckets). */
    @GetMapping("/timeseries")
    public ResponseEntity<List<FinanceTimePoint>> timeSeries(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "DAY") Granularity granularity) {
        return ResponseEntity.ok(
                reports.timeSeries(from.atStartOfDay(), to.plusDays(1).atStartOfDay(), granularity));
    }

    /**
     * Product rankings: {@code metric=UNITS} (best selling), {@code PROFIT} (most
     * profitable), {@code MARGIN} (lowest margin), or {@code REVENUE}. Defaults to
     * the current month when no range is given.
     */
    @GetMapping("/products/top")
    public ResponseEntity<List<ProductFinancialRow>> topProducts(
            @RequestParam(defaultValue = "UNITS") ProductRanking metric,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDateTime start;
        LocalDateTime end;
        if (from == null || to == null) {
            LocalDateTime[] m = reports.thisMonth();
            start = m[0];
            end = m[1];
        } else {
            start = from.atStartOfDay();
            end = to.plusDays(1).atStartOfDay();
        }
        return ResponseEntity.ok(reports.topProducts(start, end, metric, limit));
    }
}
