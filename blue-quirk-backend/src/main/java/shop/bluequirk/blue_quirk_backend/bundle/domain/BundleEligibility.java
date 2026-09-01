package shop.bluequirk.blue_quirk_backend.bundle.domain;

/**
 * Which catalog items a bundle offer applies to. Reuses BlueQuirk's existing
 * category (= "collection") and product model — no new taxonomy is introduced.
 */
public enum BundleEligibility {

    /** Every product in the catalog is eligible. */
    ALL_PRODUCTS,

    /**
     * Only products belonging to one of the offer's eligible categories
     * (collections). This is how the "Bloom Collection" offer is modeled.
     */
    CATEGORY,

    /** Only the explicitly listed product ids. */
    SELECTED_PRODUCTS
}
