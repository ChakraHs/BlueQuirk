package shop.bluequirk.blue_quirk_backend.dto.catalog;

/** One localized name/description pair for a product, keyed by {@code lang}. */
public record CatalogContentTranslation(
        String lang,
        String name,
        String description
) {}
