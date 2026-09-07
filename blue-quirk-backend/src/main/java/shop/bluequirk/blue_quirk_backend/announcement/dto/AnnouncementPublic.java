package shop.bluequirk.blue_quirk_backend.announcement.dto;

import shop.bluequirk.blue_quirk_backend.announcement.entity.Announcement;

/**
 * Storefront-safe view of a single eligible announcement, with the message + link
 * text already resolved to the requested language (FR fallback). Only display fields
 * are exposed. The message may still contain {placeholders} the frontend resolves
 * against live cart/discount state — the backend never fabricates those (spec §13).
 */
public record AnnouncementPublic(
        Long id,
        String message,
        String type,
        String link,
        String linkText,
        boolean openInNewTab,
        String icon,
        String bgColor,
        String textColor,
        Integer displayDuration,
        boolean dismissible
) {
    public static AnnouncementPublic from(Announcement a, String lang) {
        return new AnnouncementPublic(
                a.getId(),
                resolve(lang, a.getMessageFr(), a.getMessageEn(), a.getMessageAr()),
                a.getType() != null ? a.getType().name() : "INFO",
                blankToNull(a.getLink()),
                resolveOptional(lang, a.getLinkTextFr(), a.getLinkTextEn(), a.getLinkTextAr()),
                a.isOpenInNewTab(),
                blankToNull(a.getIcon()),
                blankToNull(a.getBgColor()),
                blankToNull(a.getTextColor()),
                a.getDisplayDuration(),
                a.isDismissible());
    }

    /** Picks the localized value with FR as the base fallback (then EN, then AR). */
    private static String resolve(String lang, String fr, String en, String ar) {
        String chosen = switch (lang == null ? "fr" : lang) {
            case "en" -> firstNonBlank(en, fr, ar);
            case "ar" -> firstNonBlank(ar, fr, en);
            default -> firstNonBlank(fr, en, ar);
        };
        return chosen != null ? chosen : "";
    }

    private static String resolveOptional(String lang, String fr, String en, String ar) {
        String v = resolve(lang, fr, en, ar);
        return (v == null || v.isBlank()) ? null : v;
    }

    private static String firstNonBlank(String... vals) {
        for (String v : vals) if (v != null && !v.isBlank()) return v.trim();
        return null;
    }

    private static String blankToNull(String v) {
        return (v == null || v.isBlank()) ? null : v.trim();
    }
}
