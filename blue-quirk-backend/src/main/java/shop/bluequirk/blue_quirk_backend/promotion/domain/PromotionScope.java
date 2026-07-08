package shop.bluequirk.blue_quirk_backend.promotion.domain;

/**
 * What part of the cart a promotion applies to. Today everything is
 * {@link #ENTIRE_ORDER}; the narrower scopes are reserved so category/product/
 * brand-restricted promotions can be added later without a schema change (the
 * matching id lists already live on {@code Promotion}).
 */
public enum PromotionScope {
    ENTIRE_ORDER,
    /** Reserved — restrict eligibility to items in specific categories. */
    CATEGORY,
    /** Reserved — restrict eligibility to specific products. */
    PRODUCT,
    /** Reserved — restrict eligibility to specific brands. */
    BRAND
}
