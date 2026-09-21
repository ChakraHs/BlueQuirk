package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;

/**
 * Payload for creating/updating a category. The base name/description are the
 * default (English); translations carry the fr/ar overrides. parentId is
 * optional (null = root).
 */
public record CategoryRequest(
        String name,
        String slug,
        String description,
        Long parentId,
        String imageUrl,
        // Storefront visibility. Optional in the payload: null (or absent) means
        // "active" so existing admin clients keep creating visible categories.
        Boolean active,
        List<CategoryTranslationDto> translations
) {}
