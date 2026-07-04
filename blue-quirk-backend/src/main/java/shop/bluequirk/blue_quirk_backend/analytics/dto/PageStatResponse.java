package shop.bluequirk.blue_quirk_backend.analytics.dto;

/** Per-page metrics for {@code GET /api/admin/analytics/pages} (also = top pages). */
public record PageStatResponse(
        String path,
        String pageType,
        long views,
        long uniqueViews,
        double avgTimeSeconds,
        double bounceRate, // % of landing sessions that bounced
        double exitRate    // % of views that were the session's exit
) {}
