package shop.bluequirk.blue_quirk_backend.progressive.engine;

/**
 * The side-effect-free result of evaluating the progressive multi-item discount for
 * a cart. Carries both the authoritative money figure ({@link #currentDiscount}) and
 * the display metadata every storefront surface needs to render progress and
 * "add one more" incentives — computed once, server-side, so no UI duplicates the
 * formula (spec §18).
 *
 * @param applies             whether any discount is unlocked right now
 * @param eligibleItemCount   items counted toward the discount (per counting method)
 * @param discountPerItem     currency unlocked per additional eligible item
 * @param currentDiscount     the discount unlocked now (already capped & rounded)
 * @param nextDiscount        the discount after adding one more eligible item (capped)
 * @param itemsUntilNext      eligible items still needed to reach the next step
 *                            (0 when the max is already reached)
 * @param maxDiscount         the configured cap (0 = uncapped)
 * @param maxDiscountReached  whether {@link #currentDiscount} has hit the cap
 */
public record ProgressiveCalculation(
        boolean applies,
        int eligibleItemCount,
        double discountPerItem,
        double currentDiscount,
        double nextDiscount,
        int itemsUntilNext,
        double maxDiscount,
        boolean maxDiscountReached
) {
    private static final ProgressiveCalculation NONE =
            new ProgressiveCalculation(false, 0, 0, 0, 0, 0, 0, false);

    /** The canonical "does not apply" outcome. */
    public static ProgressiveCalculation none() {
        return NONE;
    }
}
