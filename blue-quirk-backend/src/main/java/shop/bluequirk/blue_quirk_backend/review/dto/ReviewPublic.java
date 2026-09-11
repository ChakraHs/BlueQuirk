package shop.bluequirk.blue_quirk_backend.review.dto;

import shop.bluequirk.blue_quirk_backend.review.entity.Review;

/**
 * A single APPROVED review as shown on the storefront card. Deliberately omits
 * moderation/order internals — only what the customer should see. Built only from
 * approved reviews (see {@code ReviewService}); never exposes PII beyond the
 * display author name the customer chose.
 */
public record ReviewPublic(
        Long id,
        int rating,
        String title,
        String body,
        String authorName,
        boolean verifiedPurchase,
        String sizePurchased,
        String variantColor,
        String photoUrl,
        String photoThumbnailUrl,
        boolean featured,
        String createdAt // ISO-8601; the frontend localizes the display format
) {
    public static ReviewPublic from(Review r) {
        return new ReviewPublic(
                r.getId(),
                r.getRating(),
                r.getTitle(),
                r.getBody(),
                r.getAuthorName(),
                r.isVerifiedPurchase(),
                r.getSizePurchased(),
                r.getVariantColor(),
                r.getPhotoUrl(),
                r.getPhotoThumbnailUrl(),
                r.isFeatured(),
                r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
    }
}
