package shop.bluequirk.blue_quirk_backend.dto.catalog;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Curated content for a single product. Any field may be omitted; the backfill
 * only ever fills gaps (blank stored values) and never overwrites existing
 * non-blank content, so a partially-populated item is expected and safe.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CatalogContentItem(
        Long productId,
        String name,
        String description,
        String material,
        List<CatalogContentTranslation> translations
) {}
