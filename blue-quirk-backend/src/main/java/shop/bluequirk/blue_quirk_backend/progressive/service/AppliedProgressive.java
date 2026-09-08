package shop.bluequirk.blue_quirk_backend.progressive.service;

/**
 * An immutable snapshot of the progressive multi-item discount as resolved for one
 * specific cart. Carries the authoritative money figure (frozen onto the order) plus
 * the display metadata the storefront renders. Produced identically for the quote
 * (display) and for checkout (charge), so what the customer sees equals what they pay.
 *
 * @param discountAmount      the discount unlocked now (0 when below the gate)
 * @param eligibleItemCount   items counted toward the discount (per counting method)
 * @param discountPerItem     currency unlocked per additional eligible item
 * @param nextDiscount        total discount after adding one more eligible item
 * @param itemsUntilNext      eligible items still needed to reach the next step
 * @param maxDiscount         the configured cap (0 = uncapped)
 * @param maxDiscountReached  whether the discount has hit the cap
 * @param ruleVersion         the settings version that produced this snapshot (§13)
 */
public record AppliedProgressive(
        double discountAmount,
        int eligibleItemCount,
        double discountPerItem,
        double nextDiscount,
        int itemsUntilNext,
        double maxDiscount,
        boolean maxDiscountReached,
        int ruleVersion
) {}
