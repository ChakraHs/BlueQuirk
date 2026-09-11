package shop.bluequirk.blue_quirk_backend.review.dto;

/**
 * Admin edit payload. All fields optional — only non-null ones are applied. Used by
 * the "edit review" action; approve/reject/feature have dedicated endpoints.
 */
public record ReviewModerationRequest(
        Integer rating,
        String title,
        String body,
        String authorName,
        String sizePurchased,
        String variantColor,
        Boolean featured,
        String status,
        String photoUrl,
        String photoThumbnailUrl
) {}
