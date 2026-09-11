package shop.bluequirk.blue_quirk_backend.analytics.domain;

/**
 * Analytics event taxonomy. New event kinds can be added here without touching
 * the storage schema (all events share the generic {@code analytics_event}
 * table), which keeps the system extensible for future funnels.
 *
 * <p>{@link #PAGE_VIEW} is stored in the dedicated {@code analytics_page_view}
 * table (heavy, indexed for page/product aggregation); the rest live in
 * {@code analytics_event}.
 */
public enum EventType {
    PAGE_VIEW,
    PRODUCT_VIEW,
    ADD_TO_CART,
    BEGIN_CHECKOUT,
    PURCHASE,
    SEARCH,
    LOGIN,
    REGISTER,
    NEWSLETTER_SIGNUP,
    WISHLIST_ADD,
    // Storefront announcement bar (presentation-only funnel signals).
    ANNOUNCEMENT_VIEW,
    ANNOUNCEMENT_CLICK,
    ANNOUNCEMENT_DISMISS,
    // Product-page reviews / social proof (engagement funnel signals). Only emitted
    // when reviews are enabled and the section actually renders.
    REVIEW_SECTION_VIEW,
    REVIEW_EXPAND,
    REVIEW_PHOTO_VIEW,
    REVIEW_SUBMISSION_STARTED,
    REVIEW_SUBMITTED,
    ADD_TO_CART_AFTER_REVIEW_INTERACTION
}
