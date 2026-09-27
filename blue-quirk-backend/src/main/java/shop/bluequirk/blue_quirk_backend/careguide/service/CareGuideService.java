package shop.bluequirk.blue_quirk_backend.careguide.service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.careguide.dto.CareGuideTemplateRequest;
import shop.bluequirk.blue_quirk_backend.careguide.dto.CareGuideTemplateResponse;
import shop.bluequirk.blue_quirk_backend.careguide.dto.CareGuideTranslationDto;
import shop.bluequirk.blue_quirk_backend.careguide.entity.CareGuideTemplate;
import shop.bluequirk.blue_quirk_backend.careguide.entity.CareGuideTemplateTranslation;
import shop.bluequirk.blue_quirk_backend.careguide.repository.CareGuideTemplateRepository;
import shop.bluequirk.blue_quirk_backend.domain.ProductType;

/**
 * CRUD + validation for reusable "Care &amp; Wear" guide templates. Thin
 * controller, all logic here — mirrors {@code AnnouncementService}. Editing a
 * template automatically updates every product that uses it (products reference
 * the template by id and the storefront resolves the guide at read time), so
 * there is no propagation step. Deletion is blocked while any product still uses
 * the template — the admin must reassign those products first.
 */
@Service
public class CareGuideService {

    private static final int MAX_NAME = 160;
    private static final int MAX_SECTION = 4000;
    private static final List<String> LANGS = List.of("fr", "en", "ar");

    private final CareGuideTemplateRepository repository;

    public CareGuideService(CareGuideTemplateRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<CareGuideTemplateResponse> list() {
        return repository.findAllWithTranslations().stream()
                .map(t -> CareGuideTemplateResponse.from(t, repository.countProductsUsing(t.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public CareGuideTemplateResponse get(Long id) {
        CareGuideTemplate t = find(id);
        return CareGuideTemplateResponse.from(t, repository.countProductsUsing(id));
    }

    @Transactional
    public CareGuideTemplateResponse create(CareGuideTemplateRequest req, String actorEmail) {
        CareGuideTemplate t = new CareGuideTemplate();
        apply(t, req);
        t.setCreatedByEmail(actorEmail);
        t.setUpdatedByEmail(actorEmail);
        CareGuideTemplate saved = repository.save(t);
        return CareGuideTemplateResponse.from(saved, 0);
    }

    @Transactional
    public CareGuideTemplateResponse update(Long id, CareGuideTemplateRequest req, String actorEmail) {
        CareGuideTemplate t = find(id);
        apply(t, req);
        t.setUpdatedByEmail(actorEmail);
        CareGuideTemplate saved = repository.save(t);
        // Editing a template updates every product using it automatically — no
        // propagation needed (products resolve the guide from the template).
        return CareGuideTemplateResponse.from(saved, repository.countProductsUsing(id));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Care guide not found");
        }
        long inUse = repository.countProductsUsing(id);
        if (inUse > 0) {
            // 409 — the admin must reassign (or clear) the guide on those products first.
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This care guide is used by " + inUse + " product(s). "
                            + "Reassign or remove it from those products before deleting.");
        }
        repository.deleteById(id);
    }

    // --- Helpers ---

    private CareGuideTemplate find(Long id) {
        return repository.findByIdWithTranslations(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Care guide not found"));
    }

    /** Validates + copies a request onto an entity (create/update share this). */
    private void apply(CareGuideTemplate t, CareGuideTemplateRequest req) {
        String name = trimToNull(req.name());
        require(name != null, "The template name is required.");
        requireLen(name, MAX_NAME, "template name");
        t.setName(name);
        t.setProductType(parseType(req.productType()));

        // Latest non-empty translation per known language.
        Map<String, CareGuideTranslationDto> byLang = new HashMap<>();
        boolean anyContent = false;
        if (req.translations() != null) {
            for (CareGuideTranslationDto dto : req.translations()) {
                if (dto == null || dto.lang() == null) continue;
                String lang = dto.lang().trim().toLowerCase(Locale.ROOT);
                if (!LANGS.contains(lang)) continue;
                validateSections(dto);
                if (hasAnyContent(dto)) {
                    byLang.put(lang, dto);
                    anyContent = true;
                } else {
                    // An all-blank language simply drops out (removed below).
                    byLang.remove(lang);
                }
            }
        }
        require(anyContent, "A care guide needs content in at least one language.");

        reconcileTranslations(t, byLang);
    }

    /**
     * Reconciles the template's translation rows with the incoming set, keyed by
     * language and MUTATING the managed collection in place: existing languages are
     * updated, languages no longer submitted are removed (orphan-deleted), and new
     * languages are inserted. Same approach as {@code ProductService.applyTranslations}
     * — avoids the insert-before-delete that would violate the (template, lang)
     * unique constraint on a clear()+re-add().
     */
    private void reconcileTranslations(CareGuideTemplate t, Map<String, CareGuideTranslationDto> byLang) {
        List<CareGuideTemplateTranslation> managed = t.getTranslations();
        Map<String, CareGuideTranslationDto> remaining = new HashMap<>(byLang);

        managed.removeIf(existing -> {
            CareGuideTranslationDto dto = remaining.remove(existing.getLang());
            if (dto == null) {
                return true; // orphanRemoval deletes this row
            }
            copyInto(existing, dto);
            return false;
        });

        for (Map.Entry<String, CareGuideTranslationDto> e : remaining.entrySet()) {
            CareGuideTemplateTranslation tr = new CareGuideTemplateTranslation();
            tr.setLang(e.getKey());
            copyInto(tr, e.getValue());
            tr.setTemplate(t);
            managed.add(tr);
        }
    }

    private void copyInto(CareGuideTemplateTranslation tr, CareGuideTranslationDto dto) {
        tr.setFabricAndFeel(trimToNull(dto.fabricAndFeel()));
        tr.setWashingAndDrying(trimToNull(dto.washingAndDrying()));
        tr.setIroning(trimToNull(dto.ironing()));
        tr.setPrintCare(trimToNull(dto.printCare()));
        tr.setTips(trimToNull(dto.tips()));
    }

    private void validateSections(CareGuideTranslationDto dto) {
        requireLen(dto.fabricAndFeel(), MAX_SECTION, "fabric & feel");
        requireLen(dto.washingAndDrying(), MAX_SECTION, "washing & drying");
        requireLen(dto.ironing(), MAX_SECTION, "ironing");
        requireLen(dto.printCare(), MAX_SECTION, "print care");
        requireLen(dto.tips(), MAX_SECTION, "tips");
    }

    private boolean hasAnyContent(CareGuideTranslationDto dto) {
        return hasText(dto.fabricAndFeel()) || hasText(dto.washingAndDrying())
                || hasText(dto.ironing()) || hasText(dto.printCare()) || hasText(dto.tips());
    }

    private ProductType parseType(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return ProductType.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown product type: " + raw);
        }
    }

    private void requireLen(String v, int max, String field) {
        if (v != null && v.length() > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "The " + field + " is too long (max " + max + " characters).");
        }
    }

    private void require(boolean cond, String msg) {
        if (!cond) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    private static String trimToNull(String s) {
        return (s != null && !s.isBlank()) ? s.strip() : null;
    }
}
