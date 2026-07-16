package shop.bluequirk.blue_quirk_backend.dto.catalog;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * The request/seed envelope for the catalog content backfill: a batch of
 * per-product content items plus optional provenance metadata. Matches the
 * bundled {@code resources/catalog/catalog-content-seed.json}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CatalogContentSeed(
        String generatedAt,
        String note,
        List<CatalogContentItem> items
) {}
