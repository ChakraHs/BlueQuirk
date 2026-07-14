package shop.bluequirk.blue_quirk_backend.dto;

/**
 * A single localized name/description pair for a product. Returned inside
 * {@link ProductResponse} so the admin edit form can load the raw per-language
 * translations (the storefront itself only reads the locale-resolved fields).
 */
public record ProductTranslationDto(
        String lang,
        String name,
        String description
) {}
