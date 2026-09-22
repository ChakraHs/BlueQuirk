package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;

/**
 * Orders-over-time series for the admin dashboard chart. One {@link Bucket} per
 * period in the requested window, with the total ({@code all}) and a per-status
 * breakdown. Buckets are zero-filled (every period in range is present, even with
 * no orders) and ordered oldest→newest, so the chart renders gaps correctly.
 */
public record OrderTimeseriesResponse(
        String granularity,  // "day" | "week" | "month"
        String from,         // inclusive window start (yyyy-MM-dd)
        String to,           // exclusive window end (yyyy-MM-dd)
        List<Bucket> buckets
) {
    public record Bucket(
            String period,   // "yyyy-MM-dd" (day/week start) or "yyyy-MM" (month)
            long all,
            long pending,
            long confirmed,
            long shipped,
            long delivered,
            long cancelled
    ) {}
}
