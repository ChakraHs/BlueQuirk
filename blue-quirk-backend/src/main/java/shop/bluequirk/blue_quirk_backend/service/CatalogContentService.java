package shop.bluequirk.blue_quirk_backend.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogBackfillResponse;
import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogBackfillResult;
import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogContentAuditItem;
import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogContentItem;
import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogContentSeed;
import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogContentTranslation;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.entity.translation.ProductTranslation;
import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;

/**
 * Admin utility that keeps the product catalog's editorial content complete.
 *
 * <p>It does two things, both safe to run any number of times:
 * <ul>
 *   <li><b>Audit</b> — reports which products are missing a description, a
 *       material, or a French/Arabic translation.</li>
 *   <li><b>Backfill</b> — applies curated content <em>gap-only</em>: a field is
 *       written only when the stored value is blank. Existing, manually-edited
 *       content is never overwritten, which makes the operation idempotent.</li>
 * </ul>
 *
 * <p>The languages the storefront ships in are French and Arabic; the product's
 * own {@code name}/{@code description} is the default-language fallback.
 */
@Service
public class CatalogContentService {

    /** Locales the storefront serves; audited for translation completeness. */
    static final List<String> STOREFRONT_LANGS = List.of("fr", "ar");

    private static final String SEED_RESOURCE = "catalog/catalog-content-seed.json";

    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;

    public CatalogContentService(ProductRepository productRepository, ObjectMapper objectMapper) {
        this.productRepository = productRepository;
        this.objectMapper = objectMapper;
    }

    /** True when a stored value carries real content (not null / not whitespace). */
    static boolean hasText(String value) {
        return value != null && !value.strip().isEmpty();
    }

    /* --------------------------------- audit -------------------------------- */

    @Transactional(readOnly = true)
    public List<CatalogContentAuditItem> audit() {
        List<Product> products = productRepository.findAllWithTranslations();
        List<CatalogContentAuditItem> report = new ArrayList<>(products.size());
        for (Product p : products) {
            boolean hasDescription = hasText(p.getDescription());
            boolean hasMaterial = hasText(p.getMaterial());
            boolean hasFr = hasTranslationDescription(p, "fr");
            boolean hasAr = hasTranslationDescription(p, "ar");

            List<String> missing = new ArrayList<>();
            if (!hasDescription) missing.add("description");
            if (!hasMaterial) missing.add("material");
            if (!hasFr) missing.add("translation:fr");
            if (!hasAr) missing.add("translation:ar");

            report.add(new CatalogContentAuditItem(
                    p.getId(), p.getName(),
                    hasDescription, hasMaterial, hasFr, hasAr,
                    missing.isEmpty(), missing));
        }
        return report;
    }

    private boolean hasTranslationDescription(Product p, String lang) {
        return findTranslation(p, lang).map(t -> hasText(t.getDescription())).orElse(false);
    }

    private Optional<ProductTranslation> findTranslation(Product p, String lang) {
        if (p.getTranslations() == null) return Optional.empty();
        return p.getTranslations().stream()
                .filter(t -> lang.equalsIgnoreCase(t.getLang()))
                .findFirst();
    }

    /* ------------------------------- backfill ------------------------------- */

    /** Applies the content bundled in the app image (the curated seed). */
    @Transactional
    public CatalogBackfillResponse backfillFromSeed(boolean dryRun) {
        return backfill(loadSeed().items(), dryRun);
    }

    /**
     * Applies the given content gap-only. Never overwrites a non-blank stored
     * value, so re-running with the same input is a no-op after the first pass.
     */
    @Transactional
    public CatalogBackfillResponse backfill(List<CatalogContentItem> items, boolean dryRun) {
        List<CatalogBackfillResult> results = new ArrayList<>();
        int fieldsApplied = 0;

        for (CatalogContentItem item : items == null ? List.<CatalogContentItem>of() : items) {
            if (item == null || item.productId() == null) {
                continue;
            }
            Optional<Product> found = productRepository.findById(item.productId());
            if (found.isEmpty()) {
                results.add(new CatalogBackfillResult(item.productId(), null, true, List.of(), List.of()));
                continue;
            }
            Product product = found.get();
            List<String> applied = new ArrayList<>();
            List<String> skipped = new ArrayList<>();

            // Base name — only when the product has none (rare; names are required).
            if (hasText(item.name())) {
                if (!hasText(product.getName())) {
                    product.setName(item.name().strip());
                    applied.add("name");
                } else {
                    skipped.add("name");
                }
            }

            // Base (default-language) description.
            if (hasText(item.description())) {
                if (!hasText(product.getDescription())) {
                    product.setDescription(item.description());
                    applied.add("description");
                } else {
                    skipped.add("description");
                }
            }

            // Material / composition.
            if (hasText(item.material())) {
                if (!hasText(product.getMaterial())) {
                    product.setMaterial(item.material().strip());
                    applied.add("material");
                } else {
                    skipped.add("material");
                }
            }

            // Per-language translations.
            if (item.translations() != null) {
                for (CatalogContentTranslation tr : item.translations()) {
                    applyTranslation(product, tr, applied, skipped);
                }
            }

            if (!applied.isEmpty() && !dryRun) {
                productRepository.save(product);
            }
            fieldsApplied += applied.size();
            results.add(new CatalogBackfillResult(
                    product.getId(), product.getName(), false, applied, skipped));
        }

        return new CatalogBackfillResponse(dryRun, results.size(), fieldsApplied, results);
    }

    /** Fills a single translation's name/description gap-only, creating the row if absent. */
    private void applyTranslation(Product product, CatalogContentTranslation tr,
                                  List<String> applied, List<String> skipped) {
        if (tr == null || !hasText(tr.lang())) {
            return;
        }
        String lang = tr.lang().strip().toLowerCase();
        Optional<ProductTranslation> existing = findTranslation(product, lang);

        if (existing.isEmpty()) {
            // No row for this language yet — create one from whatever is provided.
            ProductTranslation created = new ProductTranslation();
            created.setLang(lang);
            created.setProduct(product);
            boolean any = false;
            if (hasText(tr.name())) {
                created.setName(tr.name().strip());
                any = true;
            }
            if (hasText(tr.description())) {
                created.setDescription(tr.description());
                any = true;
            }
            if (any) {
                product.getTranslations().add(created);
                applied.add("translation:" + lang);
            }
            return;
        }

        // Row exists — top up only the blank fields.
        ProductTranslation row = existing.get();
        boolean changed = false;
        if (hasText(tr.name()) && !hasText(row.getName())) {
            row.setName(tr.name().strip());
            applied.add("translation:" + lang + ".name");
            changed = true;
        }
        if (hasText(tr.description()) && !hasText(row.getDescription())) {
            row.setDescription(tr.description());
            applied.add("translation:" + lang + ".description");
            changed = true;
        }
        if (!changed) {
            skipped.add("translation:" + lang);
        }
    }

    /* -------------------------------- seed I/O ------------------------------ */

    /** Reads the bundled curated content seed from the classpath. */
    public CatalogContentSeed loadSeed() {
        try (InputStream in = new ClassPathResource(SEED_RESOURCE).getInputStream()) {
            return objectMapper.readValue(in, CatalogContentSeed.class);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to read catalog content seed: " + SEED_RESOURCE, e);
        }
    }
}
