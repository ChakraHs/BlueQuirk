package shop.bluequirk.blue_quirk_backend.review.dto;

/**
 * Customer-submitted review payload. Always accompanied by a valid delivery
 * {@code token}; the service verifies the token's order actually contains
 * {@code productId} before accepting — that check (not any client field) is what
 * sets "Verified purchase". {@code photoUrl}/{@code photoThumbnailUrl} come from the
 * separate token-gated photo upload endpoint (empty when no photo).
 */
public record ReviewSubmissionRequest(
        String token,
        Long productId,
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
