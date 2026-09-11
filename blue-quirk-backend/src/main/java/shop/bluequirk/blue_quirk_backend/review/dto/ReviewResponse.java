package shop.bluequirk.blue_quirk_backend.review.dto;

import shop.bluequirk.blue_quirk_backend.review.entity.Review;

/**
 * Full review record for the admin moderation UI (includes status, verification,
 * order link and audit fields the storefront never sees). {@code productName} is
 * resolved best-effort by the service so the admin table can label each row without
 * a second round-trip.
 */
public record ReviewResponse(
        Long id,
        Long productId,
        String productName,
        Long orderId,
        int rating,
        String title,
        String body,
        String authorName,
        String sizePurchased,
        String variantColor,
        boolean verifiedPurchase,
        String status,
        boolean featured,
        String photoUrl,
        String photoThumbnailUrl,
        String lang,
        String createdAt,
        String approvedAt,
        String moderatedByEmail
) {
    public static ReviewResponse from(Review r, String productName) {
        return new ReviewResponse(
                r.getId(),
                r.getProductId(),
                productName,
                r.getOrderId(),
                r.getRating(),
                r.getTitle(),
                r.getBody(),
                r.getAuthorName(),
                r.getSizePurchased(),
                r.getVariantColor(),
                r.isVerifiedPurchase(),
                r.getStatus().name(),
                r.isFeatured(),
                r.getPhotoUrl(),
                r.getPhotoThumbnailUrl(),
                r.getLang(),
                r.getCreatedAt() != null ? r.getCreatedAt().toString() : null,
                r.getApprovedAt() != null ? r.getApprovedAt().toString() : null,
                r.getModeratedByEmail());
    }
}
