package shop.bluequirk.blue_quirk_backend.dto.catalog;

import java.util.List;

/**
 * Summary of a backfill run. {@code dryRun=true} means nothing was persisted —
 * the results describe what <em>would</em> change.
 */
public record CatalogBackfillResponse(
        boolean dryRun,
        int itemsProcessed,
        int fieldsApplied,
        List<CatalogBackfillResult> results
) {}
