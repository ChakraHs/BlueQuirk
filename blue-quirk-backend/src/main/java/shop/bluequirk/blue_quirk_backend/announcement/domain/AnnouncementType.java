package shop.bluequirk.blue_quirk_backend.announcement.domain;

/**
 * A simple, extensible taxonomy for storefront announcements. The type primarily
 * helps the admin organize/filter announcements; it does NOT force radically
 * different visual styles (spec §12) — the storefront keeps one consistent, premium
 * look. New kinds can be added here without touching storage or the frontend.
 */
public enum AnnouncementType {
    INFO,
    PROMOTION,
    SHIPPING,
    NEW_COLLECTION,
    IMPORTANT
}
