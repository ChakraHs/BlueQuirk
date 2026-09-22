package shop.bluequirk.blue_quirk_backend.review.dto;

/**
 * Admin edit payload. All fields optional — only non-null ones are applied. Used by
 * the "edit review" action and by approve-with-moderation.
 *
 * <p>Display name: pass {@code displayNameMode} to derive the public name from the
 * preserved original (ORIGINAL / FIRST_NAME / ANONYMIZED), or CUSTOM together with
 * {@code customDisplayName}. When {@code displayNameMode} is set it takes precedence
 * over a raw {@code authorName}.
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
        String photoThumbnailUrl,
        String displayNameMode,
        String customDisplayName
) {}
