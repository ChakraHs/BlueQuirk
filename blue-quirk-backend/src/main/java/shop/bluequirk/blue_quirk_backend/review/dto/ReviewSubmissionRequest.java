package shop.bluequirk.blue_quirk_backend.review.dto;

import java.util.List;

/**
 * Customer-submitted review payload. Always accompanied by a valid delivery
 * {@code token}; the service verifies the token's order actually contains each
 * reviewed product before accepting — that check (not any client field) is what
 * sets "Verified purchase". {@code photoUrl}/{@code photoThumbnailUrl} come from the
 * separate token-gated photo upload endpoint (empty when no photo).
 *
 * <p>A customer may review several products from the order at once: {@code productIds}
 * carries the multi-select. {@code productId} is kept for backwards compatibility and
 * is treated as a single-element selection when {@code productIds} is empty. The same
 * rating/body/photo is applied to every selected product.
 */
public record ReviewSubmissionRequest(
        String token,
        Long productId,
        List<Long> productIds,
        Integer rating,
        String title,
        String body,
        String authorName,
        String sizePurchased,
        String variantColor,
        String photoUrl,
        String photoThumbnailUrl,
        String lang
) {}
