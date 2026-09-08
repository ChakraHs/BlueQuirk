package shop.bluequirk.blue_quirk_backend.progressive.domain;

/**
 * How the progressive multi-item discount counts "items" when deciding how many
 * discount steps a cart has unlocked. Only eligible units (per the offer's product
 * scope) are ever counted.
 */
public enum ProgressiveCountingMethod {

    /**
     * One eligible <b>product line</b> = one item, regardless of its quantity.
     * Cart of Hoodie×1 + Shirt×1 + Shirt×1 → 3 items. This is the default and
     * matches the "the more different products you add" incentive.
     */
    UNIQUE_PRODUCTS,

    /**
     * Each eligible <b>unit</b> counts. Hoodie×2 + Shirt×1 → 3 items. Rewards
     * buying more of the same product too.
     */
    TOTAL_QUANTITY
}
