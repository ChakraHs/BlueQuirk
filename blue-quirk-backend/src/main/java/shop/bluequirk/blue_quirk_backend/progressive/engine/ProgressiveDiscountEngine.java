package shop.bluequirk.blue_quirk_backend.progressive.engine;

import org.springframework.stereotype.Component;

/**
 * The reusable, side-effect-free heart of the progressive multi-item discount. Given
 * a counted eligible-item total and the reward parameters, it produces the current
 * discount plus the "next step" metadata for the storefront. It performs no I/O and
 * mutates nothing, so it is shared unchanged by the storefront quote endpoint
 * (display) and by checkout (the amount actually charged) — the two can never drift.
 *
 * <p>Formula (spec §4): {@code discount = clamp((count − 1) × perItem, 0, maxDiscount)}.
 * Kept parameter-driven (not hard-coded) so a future tiered strategy can reuse the
 * same clamping/rounding without touching callers (spec §23).
 */
@Component
public class ProgressiveDiscountEngine {

    /**
     * Evaluates the discount for {@code eligibleItemCount} items.
     *
     * @param eligibleItemCount items counted toward the discount (per counting method)
     * @param minItems          minimum count before any discount unlocks (≥ 1)
     * @param perItem           currency unlocked per additional eligible item (≥ 0)
     * @param maxDiscount       cap on the total discount (≤ 0 means uncapped)
     * @return the calculation; {@link ProgressiveCalculation#none()} when nothing applies
     */
    public ProgressiveCalculation evaluate(int eligibleItemCount, int minItems,
                                           double perItem, double maxDiscount) {
        int gate = Math.max(1, minItems);
        double step = Math.max(0, perItem);
        boolean capped = maxDiscount > 0;

        // Below the activation gate or a non-positive reward → nothing unlocked, but
        // we still surface how far the customer is from the first step so the UI can
        // nudge them ("add one more to unlock ...").
        if (eligibleItemCount < gate || step <= 0) {
            double next = capAt(discountFor(Math.max(gate, eligibleItemCount + 1), step), maxDiscount);
            int untilNext = Math.max(1, gate - eligibleItemCount);
            return new ProgressiveCalculation(false, Math.max(0, eligibleItemCount), step,
                    0, round(next), untilNext, Math.max(0, maxDiscount), false);
        }

        double raw = discountFor(eligibleItemCount, step);
        double current = capAt(raw, maxDiscount);
        boolean maxReached = capped && raw >= maxDiscount;

        double nextRaw = discountFor(eligibleItemCount + 1, step);
        double next = capAt(nextRaw, maxDiscount);
        // Once capped, there is no further step to unlock.
        int itemsUntilNext = maxReached ? 0 : 1;

        return new ProgressiveCalculation(current > 0, eligibleItemCount, step,
                round(current), round(next), itemsUntilNext,
                Math.max(0, maxDiscount), maxReached);
    }

    /** The uncapped discount for a given eligible count: (count − 1) × perItem. */
    private double discountFor(int count, double perItem) {
        return Math.max(0, count - 1) * perItem;
    }

    private double capAt(double value, double maxDiscount) {
        if (maxDiscount > 0) return Math.min(value, maxDiscount);
        return value;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
