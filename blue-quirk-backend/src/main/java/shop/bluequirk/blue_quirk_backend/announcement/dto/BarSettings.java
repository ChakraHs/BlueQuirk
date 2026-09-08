package shop.bluequirk.blue_quirk_backend.announcement.dto;

/**
 * Bar-level (global) presentation config for the announcement bar — shared by the
 * admin GET/PUT settings endpoint. Colors are hex strings or blank (= theme default);
 * animation is FADE | SLIDE | CAROUSEL; rotationSeconds is the default per-announcement
 * dwell time in one-at-a-time modes. The service normalizes/validates all fields.
 */
public record BarSettings(
        boolean enabled,
        String bgColor,
        String textColor,
        String animation,
        int rotationSeconds
) {}
