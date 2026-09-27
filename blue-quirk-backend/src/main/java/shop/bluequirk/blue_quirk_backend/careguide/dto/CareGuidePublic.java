package shop.bluequirk.blue_quirk_backend.careguide.dto;

import java.util.List;

import shop.bluequirk.blue_quirk_backend.careguide.entity.CareGuideTemplate;
import shop.bluequirk.blue_quirk_backend.careguide.entity.CareGuideTemplateTranslation;

/**
 * The care guide resolved to a single storefront language, embedded in the
 * product detail response. Only sections that carry text are included, so the
 * frontend renders exactly the blocks that exist. When no language on the
 * template has any content, {@link #from} returns {@code null} and the storefront
 * hides the section entirely.
 *
 * <p>Section titles are fixed storefront strings (in the frontend i18n
 * dictionary); this payload carries only the per-section body text plus a
 * stable {@code key} the frontend maps to the localized title.
 */
public record CareGuidePublic(
        Long templateId,
        List<Section> sections
) {
    public record Section(String key, String body) {}

    /**
     * Resolves the template into the requested language, falling back to French
     * (the store's base language) then to any language that has content, so a
     * guide is never blank just because one language was left empty. Returns
     * {@code null} when the template has no content in any language.
     */
    public static CareGuidePublic from(CareGuideTemplate template, String lang) {
        if (template == null || template.getTranslations() == null) {
            return null;
        }
        CareGuideTemplateTranslation tr = pick(template, normalize(lang));
        if (tr == null) {
            return null;
        }
        List<Section> sections = new java.util.ArrayList<>(5);
        addSection(sections, "fabric", tr.getFabricAndFeel());
        addSection(sections, "washDry", tr.getWashingAndDrying());
        addSection(sections, "ironing", tr.getIroning());
        addSection(sections, "print", tr.getPrintCare());
        addSection(sections, "tips", tr.getTips());
        if (sections.isEmpty()) {
            return null;
        }
        return new CareGuidePublic(template.getId(), sections);
    }

    private static void addSection(List<Section> out, String key, String body) {
        if (body != null && !body.isBlank()) {
            out.add(new Section(key, body.strip()));
        }
    }

    /** Requested language if it has content, else fr, else any language with content. */
    private static CareGuideTemplateTranslation pick(CareGuideTemplate t, String lang) {
        CareGuideTemplateTranslation exact = byLang(t, lang);
        if (exact != null && exact.hasAnyContent()) return exact;
        CareGuideTemplateTranslation fr = byLang(t, "fr");
        if (fr != null && fr.hasAnyContent()) return fr;
        return t.getTranslations().stream()
                .filter(CareGuideTemplateTranslation::hasAnyContent)
                .findFirst()
                .orElse(null);
    }

    private static CareGuideTemplateTranslation byLang(CareGuideTemplate t, String lang) {
        return t.getTranslations().stream()
                .filter(x -> lang.equalsIgnoreCase(x.getLang()))
                .findFirst()
                .orElse(null);
    }

    private static String normalize(String lang) {
        String l = lang == null ? "" : lang.trim().toLowerCase();
        return (l.equals("en") || l.equals("ar")) ? l : "fr";
    }
}
