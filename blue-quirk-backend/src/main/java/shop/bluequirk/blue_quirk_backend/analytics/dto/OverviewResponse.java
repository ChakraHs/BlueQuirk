package shop.bluequirk.blue_quirk_backend.analytics.dto;

import java.util.List;

/**
 * Payload for {@code GET /api/admin/analytics/overview}: the KPI cards, the
 * "traffic overview" fixed-window cards, the online-visitor gauge, and the daily
 * series that backs the visits / unique / sales-vs-visits charts. Revenue and
 * orders come from the authoritative Orders tables.
 */
public record OverviewResponse(
        long totalVisits,
        long uniqueVisitors,
        long newVisitors,
        long returningVisitors,
        long pageViews,
        double avgSessionSeconds,
        double bounceRate,     // %
        double conversionRate, // %  (orders / visits)
        double visitsGrowthPct,
        long onlineVisitors,
        TrafficOverview traffic,
        List<DayStat> series
) {

    /** Fixed-window visit counts shown as their own cards, independent of the filter. */
    public record TrafficOverview(
            long today,
            long yesterday,
            long thisWeek,
            long thisMonth,
            long lastMonth,
            double growthPct // this month vs last month
    ) {}

    /** One day of the series. */
    public record DayStat(
            String day,
            long visits,
            long uniques,
            long pageViews,
            long orders,
            double revenue
    ) {}
}
