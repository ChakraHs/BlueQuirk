package shop.bluequirk.blue_quirk_backend.promotion.domain;

/**
 * Derived, human-facing status of a promotion, computed from its {@code active}
 * flag, validity window and usage — never persisted. Drives the status badge in
 * the admin list.
 */
public enum PromotionLifecycleStatus {
    /** Disabled by an admin (active = false). */
    DISABLED,
    /** Enabled, but its start date is still in the future. */
    SCHEDULED,
    /** Enabled and currently within its validity window. */
    ACTIVE,
    /** Its end date has passed. */
    EXPIRED,
    /** Global usage limit reached. */
    EXHAUSTED
}
