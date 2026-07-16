package shop.bluequirk.blue_quirk_backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogBackfillResponse;
import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogContentAuditItem;
import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogContentSeed;
import shop.bluequirk.blue_quirk_backend.service.CatalogContentService;

/**
 * Admin utility for completing the catalog's editorial content. Everything under
 * {@code /api/admin/**} is locked to the {@code admin} authority by
 * SecurityConfig's fail-closed {@code anyRequest()} rule.
 *
 * <ul>
 *   <li>{@code GET  /api/admin/catalog/content-audit} — list products missing a
 *       description, material, or FR/AR translation (read-only).</li>
 *   <li>{@code POST /api/admin/catalog/content-backfill} — apply a supplied
 *       content batch, gap-only. {@code ?dryRun=true} previews without saving.</li>
 *   <li>{@code POST /api/admin/catalog/content-backfill/seed} — apply the curated
 *       content bundled with the app, gap-only. Idempotent.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/admin/catalog")
public class CatalogContentController {

    private final CatalogContentService catalogContentService;

    public CatalogContentController(CatalogContentService catalogContentService) {
        this.catalogContentService = catalogContentService;
    }

    @GetMapping("/content-audit")
    public ResponseEntity<List<CatalogContentAuditItem>> audit() {
        return ResponseEntity.ok(catalogContentService.audit());
    }

    @PostMapping("/content-backfill")
    public ResponseEntity<CatalogBackfillResponse> backfill(
            @RequestBody CatalogContentSeed request,
            @RequestParam(defaultValue = "false") boolean dryRun) {
        return ResponseEntity.ok(catalogContentService.backfill(request.items(), dryRun));
    }

    @PostMapping("/content-backfill/seed")
    public ResponseEntity<CatalogBackfillResponse> backfillFromSeed(
            @RequestParam(defaultValue = "false") boolean dryRun) {
        return ResponseEntity.ok(catalogContentService.backfillFromSeed(dryRun));
    }
}
