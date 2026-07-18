package shop.bluequirk.blue_quirk_backend.dto.catalog;

import java.util.List;

/**
 * Outcome of backfilling one product: which fields were filled ({@code applied})
 * and which were left untouched because they already had content ({@code
 * skipped}). {@code notFound} flags an item whose productId does not exist.
 */
public record CatalogBackfillResult(
        Long productId,
        String name,
        boolean notFound,
        List<String> applied,
        List<String> skipped
) {}
