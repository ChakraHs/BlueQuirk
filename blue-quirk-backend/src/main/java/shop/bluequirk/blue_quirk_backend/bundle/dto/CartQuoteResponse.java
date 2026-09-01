package shop.bluequirk.blue_quirk_backend.bundle.dto;

/**
 * The authoritative server-side pricing of a cart, used by the cart and checkout
 * pages for display. It is computed by the exact same services that price an
 * order, so what the customer sees equals what they are charged.
 *
 * <p>Ordering of discounts (documented policy): the automatic <b>bundle</b>
 * discount is applied first on the goods subtotal; a <b>coupon</b>, if valid, is
 * then computed on the already-reduced subtotal. {@code totalDiscount} is their
 * sum and {@code total = subtotal − totalDiscount + shippingFee}.
 */
public record CartQuoteResponse(
        String currency,
        double subtotal,
        double shippingFee,
        // --- Automatic bundle ---
        boolean bundleApplied,
        Long bundleOfferId,
        String bundleLabel,
        double bundleDiscount,
        int bundleUnits,
        // --- Coupon (only when a code was supplied) ---
        String couponCode,
        boolean couponValid,
        String couponMessage,
        double couponDiscount,
        // --- Cart upsell (only when no bundle applied but one is within reach) ---
        boolean upsellAvailable,
        String upsellLabel,
        int upsellMinQuantity,
        int upsellUnitsNeeded,
        double upsellSetPrice,
        // --- Totals ---
        double totalDiscount,
        double total
) {}
