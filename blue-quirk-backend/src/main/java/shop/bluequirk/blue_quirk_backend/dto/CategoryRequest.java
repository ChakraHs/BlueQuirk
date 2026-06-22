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
        List<CategoryTranslationDto> translations
) {}
