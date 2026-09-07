package shop.bluequirk.blue_quirk_backend.bundle.dto;

/**
 * The authoritative server-side pricing of a cart, used by the cart and checkout
 * pages for display. It is computed by the exact same services that price an
 * order, so what the customer sees equals what they are charged.
 *
 * <p>Ordering of discounts (documented policy): the automatic <b>bundle</b>
 * discount is applied first on the goods subtotal, then the automatic
 * <b>progressive</b> multi-item discount, then a <b>coupon</b> (if valid) on the
 * already-reduced subtotal. {@code totalDiscount} is their sum and
 * {@code total = subtotal − totalDiscount + shippingFee}.
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
        // --- Progressive multi-item discount (automatic; display + charge) ---
        // progressiveEnabled: the campaign is live and the cart has eligible items,
        //   so the storefront should show progress even before the first step unlocks.
        // progressiveApplied: a discount (> 0) is unlocked right now.
        boolean progressiveEnabled,
        boolean progressiveApplied,
        double progressiveDiscount,
        int progressiveEligibleCount,
        double progressivePerItem,
        double progressiveNextDiscount,
        int progressiveItemsUntilNext,
        double progressiveMaxDiscount,
        boolean progressiveMaxReached,
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
