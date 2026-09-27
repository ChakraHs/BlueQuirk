package shop.bluequirk.blue_quirk_backend.careguide.dto;

import java.util.Comparator;
import java.util.List;

import shop.bluequirk.blue_quirk_backend.careguide.entity.CareGuideTemplate;
import shop.bluequirk.blue_quirk_backend.careguide.entity.CareGuideTemplateTranslation;

/**
 * Full admin view of a care-guide template: its name, type, seeded flag, all
 * per-language sections, and {@code inUseCount} — how many products currently use
 * it (drives the admin list and the "reassign before deleting" guard).
 */
public record CareGuideTemplateResponse(
        Long id,
        String name,
        String productType,
        boolean seeded,
        long inUseCount,
        List<CareGuideTranslationDto> translations,
        String updatedByEmail,
        String updatedAt
) {
    public static CareGuideTemplateResponse from(CareGuideTemplate t, long inUseCount) {
        List<CareGuideTranslationDto> tr = t.getTranslations().stream()
                .map(CareGuideTemplateResponse::toDto)
                .sorted(Comparator.comparing(CareGuideTranslationDto::lang,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
        return new CareGuideTemplateResponse(
                t.getId(),
                t.getName(),
                t.getProductType() != null ? t.getProductType().name() : null,
                t.isSeeded(),
                inUseCount,
                tr,
                t.getUpdatedByEmail(),
                t.getUpdatedAt() != null ? t.getUpdatedAt().toString() : null);
    }

    private static CareGuideTranslationDto toDto(CareGuideTemplateTranslation tr) {
        return new CareGuideTranslationDto(
                tr.getLang(),
                tr.getFabricAndFeel(),
                tr.getWashingAndDrying(),
                tr.getIroning(),
                tr.getPrintCare(),
                tr.getTips());
    }
}
