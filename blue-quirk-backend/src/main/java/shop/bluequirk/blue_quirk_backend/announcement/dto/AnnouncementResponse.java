package shop.bluequirk.blue_quirk_backend.announcement.dto;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import shop.bluequirk.blue_quirk_backend.announcement.entity.Announcement;

/**
 * Full admin view of an announcement, including a computed {@link #status} the admin
 * list uses to show ACTIVE / SCHEDULED / EXPIRED / DISABLED at a glance (spec §23).
 */
public record AnnouncementResponse(
        Long id,
        String messageFr,
        String messageEn,
        String messageAr,
        String type,
        int priority,
        boolean active,
        String startAt,
        String endAt,
        String link,
        String linkTextFr,
        String linkTextEn,
        String linkTextAr,
        boolean openInNewTab,
        String icon,
        String bgColor,
        String textColor,
        Integer displayDuration,
        boolean dismissible,
        String status,
        String updatedByEmail,
        String updatedAt
) {
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static AnnouncementResponse from(Announcement a) {
        return new AnnouncementResponse(
                a.getId(),
                a.getMessageFr(),
                a.getMessageEn(),
                a.getMessageAr(),
                a.getType() != null ? a.getType().name() : null,
                a.getPriority(),
                a.isActive(),
                a.getStartAt() != null ? a.getStartAt().format(ISO) : null,
                a.getEndAt() != null ? a.getEndAt().format(ISO) : null,
                a.getLink(),
                a.getLinkTextFr(),
                a.getLinkTextEn(),
                a.getLinkTextAr(),
                a.isOpenInNewTab(),
                a.getIcon(),
                a.getBgColor(),
                a.getTextColor(),
                a.getDisplayDuration(),
                a.isDismissible(),
                status(a),
                a.getUpdatedByEmail(),
                a.getUpdatedAt() != null ? a.getUpdatedAt().toString() : null);
    }

    /** Derives a human status from active + schedule vs. the server clock. */
    private static String status(Announcement a) {
        if (!a.isActive()) return "DISABLED";
        LocalDateTime now = LocalDateTime.now();
        if (a.getStartAt() != null && now.isBefore(a.getStartAt())) return "SCHEDULED";
        if (a.getEndAt() != null && now.isAfter(a.getEndAt())) return "EXPIRED";
        return "ACTIVE";
    }
}
