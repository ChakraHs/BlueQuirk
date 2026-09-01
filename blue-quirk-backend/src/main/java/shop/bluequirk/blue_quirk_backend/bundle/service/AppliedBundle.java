package shop.bluequirk.blue_quirk_backend.bundle.service;

/**
 * The single, authoritative bundle discount applied to a cart / order, resolved
 * server-side from the current configuration. Mirrors the promotion module's
 * {@code AppliedPromotion}. The client never supplies any of these values.
 *
 * @param offerId          the winning offer's id
 * @param label            the offer's customer-facing name (snapshotted on the order)
 * @param discountAmount   discount in MAD
 * @param bundledUnits     eligible units consumed by complete bundle groups
 * @param groups           number of complete bundle groups formed
 * @param groupNormalTotal normal (pre-discount) price of the bundled units
 */
public record AppliedBundle(
        Long offerId,
        String label,
        double discountAmount,
        int bundledUnits,
        int groups,
        double groupNormalTotal) {}
