package shop.bluequirk.blue_quirk_backend.bundle.engine;

/**
 * The outcome of evaluating one bundle offer against a set of eligible units.
 * Pure value object — no persistence, no side effects.
 *
 * @param applies          whether at least one complete bundle group was formed
 * @param discountAmount   total discount in MAD (0 when it does not apply)
 * @param bundledUnits     how many eligible units were consumed by complete groups
 * @param groups           number of complete bundle groups formed
 * @param groupNormalTotal the normal (pre-discount) price of the bundled units
 */
public record BundleCalculation(
        boolean applies,
        double discountAmount,
        int bundledUnits,
        int groups,
        double groupNormalTotal) {

    public static BundleCalculation none() {
        return new BundleCalculation(false, 0, 0, 0, 0);
    }
}
