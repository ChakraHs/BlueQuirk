package shop.bluequirk.blue_quirk_backend.careguide.dto;

import java.util.List;

/**
 * Admin create/update payload for a care-guide template. {@code productType} is
 * an optional hint ("T_SHIRT" | "HOODIE" | null). {@code translations} carries
 * one entry per language the admin filled in.
 */
public record CareGuideTemplateRequest(
        String name,
        String productType,
        List<CareGuideTranslationDto> translations
) {}
