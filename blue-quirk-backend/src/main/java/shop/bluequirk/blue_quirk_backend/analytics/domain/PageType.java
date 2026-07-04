package shop.bluequirk.blue_quirk_backend.analytics.domain;

/**
 * Coarse classification of a storefront page, derived server-side from the
 * request path. Kept intentionally small and stable so page analytics can be
 * grouped by intent (e.g. all product pages together) rather than by raw URL.
 */
public enum PageType {
    HOME,
    COLLECTION,
    PRODUCT,
    CATEGORY,
    CART,
    CHECKOUT,
    WISHLIST,
    ABOUT,
    CONTACT,
    SEARCH,
    ACCOUNT,
    OTHER
}
