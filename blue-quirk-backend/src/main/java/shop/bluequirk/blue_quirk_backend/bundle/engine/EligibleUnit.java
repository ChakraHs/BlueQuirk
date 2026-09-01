package shop.bluequirk.blue_quirk_backend.bundle.engine;

/**
 * One eligible physical unit from the cart fed to the {@link BundleEngine}: which
 * product it is (for the same-product / distinct-product rules) and its
 * authoritative unit price (already server-priced, never client-supplied).
 * A cart line of quantity N expands into N of these.
 */
public record EligibleUnit(Long productId, double unitPrice) {}
