package shop.bluequirk.blue_quirk_backend.announcement.dto;

import java.util.List;

/**
 * The storefront's single announcement-bar payload: the global on/off switch, the
 * bar-level presentation defaults (colors, transition, rotation speed) and the
 * ordered, already-eligible announcements for the requested language. The bar shows
 * only when {@code enabled} is true and {@code items} is non-empty.
 */
public record AnnouncementBarResponse(
        boolean enabled,
        String bgColor,
        String textColor,
        String animation,
        int rotationSeconds,
        List<AnnouncementPublic> items
) {}
