package shop.bluequirk.blue_quirk_backend.bundle.domain;

/**
 * How a quantity-bundle offer prices a complete group of {@code minQuantity}
 * eligible items. Mirrors the promotion module's {@code DiscountType} split but is
 * bundle-specific (the value is interpreted <b>per completed group</b>, never per
 * order). All three are wired into {@code bundle.engine.BundleEngine}.
 */
public enum BundlePricingMethod {

    /**
     * The whole group is sold for a flat price ({@code bundleValue}). The discount
     * for a group is {@code Σ(normal unit prices) − bundleValue}, floored at 0.
     * Example: Buy 2 → 349 DH.
     */
    FIXED_BUNDLE_PRICE,

    /**
     * A percentage (0–100) off the group's normal price. Example: Buy 2 → 10% off.
     */
    PERCENTAGE_DISCOUNT,

    /**
     * A flat currency amount off each completed group (capped at the group's normal
     * price so a group can never go negative). Example: Buy 2 → 30 DH off.
     */
    FIXED_AMOUNT_DISCOUNT
}
