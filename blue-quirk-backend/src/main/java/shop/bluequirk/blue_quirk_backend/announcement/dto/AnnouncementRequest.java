package shop.bluequirk.blue_quirk_backend.announcement.dto;

/**
 * Admin create/update payload for an announcement. Dates arrive as ISO local
 * date-time strings ("2026-09-15T00:00") or null; the service parses/validates them.
 * Messages are plain text (no HTML).
 */
public record AnnouncementRequest(
        String messageFr,
        String messageEn,
        String messageAr,
        String type,
        Integer priority,
        Boolean active,
        String startAt,
        String endAt,
        String link,
        String linkTextFr,
        String linkTextEn,
        String linkTextAr,
        Boolean openInNewTab,
        String icon,
        String bgColor,
        String textColor,
        Integer displayDuration,
        Boolean dismissible
) {}
