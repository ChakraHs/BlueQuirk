package shop.bluequirk.blue_quirk_backend.promotion.domain;

/**
 * How a promotion's discount is computed. Only {@link #PERCENTAGE} and
 * {@link #FIXED_AMOUNT} are wired up today; the remaining values are declared so
 * the schema, DTOs and admin UI already carry them and new discount strategies
 * can be added (see {@code promotion.engine.DiscountStrategy}) without a data or
 * API redesign.
 */
public enum DiscountType {
    /** Percentage off the eligible subtotal (0–100), optionally capped by maxDiscountAmount. */
    PERCENTAGE,
    /** Flat currency amount off the eligible subtotal. */
    FIXED_AMOUNT,
    /** Waive shipping fees. Reserved — not yet applied by the engine. */
    FREE_SHIPPING,
    /** Buy X get Y free/discounted. Reserved — not yet applied by the engine. */
    BUY_X_GET_Y
}
