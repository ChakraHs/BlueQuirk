package shop.bluequirk.blue_quirk_backend.review.dto;

import java.util.Map;

/**
 * Batch of compact per-product ratings (average + count) for the product-card badge
 * in listings. {@code enabled} mirrors the storefront {@code reviewsEnabled} flag so
 * the frontend renders no rating when reviews are off. Products with zero approved
 * reviews are simply omitted from {@code ratings} — the card then shows nothing
 * (never a fake "0" or empty stars).
 */
public record ProductRatingsResponse(boolean enabled, Map<Long, Rating> ratings) {

    public record Rating(double average, long total) {}

    public static ProductRatingsResponse disabled() {
        return new ProductRatingsResponse(false, Map.of());
    }
}
