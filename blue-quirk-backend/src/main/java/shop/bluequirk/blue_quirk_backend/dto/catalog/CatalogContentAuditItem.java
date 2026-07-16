package shop.bluequirk.blue_quirk_backend.dto.catalog;

import java.util.List;

/**
 * Read-only report of what content a product is missing. {@code missing} lists
 * human-readable gap keys (e.g. {@code "description"}, {@code "translation:ar"})
 * so the admin can see at a glance which products need attention.
 */
public record CatalogContentAuditItem(
        Long productId,
        String name,
        boolean hasDescription,
        boolean hasMaterial,
        boolean hasFrTranslation,
        boolean hasArTranslation,
        boolean complete,
        List<String> missing
) {}
