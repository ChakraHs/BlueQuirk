package shop.bluequirk.blue_quirk_backend.review.dto;

import shop.bluequirk.blue_quirk_backend.review.repository.ReviewRepository.RatingAggregate;

/**
 * Compact rating summary for a product ("★ 4.8 · 27 reviews" + the distribution
 * bars). {@code enabled} mirrors the storefront {@code reviewsEnabled} flag so the
 * frontend can render <i>nothing</i> when reviews are off — the empty-state contract
 * (no placeholder stars, no "0 reviews"). When enabled but a product has no approved
 * reviews, {@code total} is 0 and the frontend hides the stars gracefully.
 */
public record ReviewSummaryResponse(
        boolean enabled,
        double average,
        long total,
        long five,
        long four,
        long three,
        long two,
        long one
) {
    /** The response used whenever reviews are globally disabled — all zeros, enabled=false. */
    public static ReviewSummaryResponse disabled() {
        return new ReviewSummaryResponse(false, 0, 0, 0, 0, 0, 0, 0);
    }

    public static ReviewSummaryResponse from(RatingAggregate a) {
        if (a == null) return new ReviewSummaryResponse(true, 0, 0, 0, 0, 0, 0, 0);
        // Round the average to one decimal for display stability (4.83 → 4.8).
        double avg = Math.round(a.getAverage() * 10.0) / 10.0;
        return new ReviewSummaryResponse(true, avg, a.getTotal(),
                a.getFive(), a.getFour(), a.getThree(), a.getTwo(), a.getOne());
    }
}
