package shop.bluequirk.blue_quirk_backend.progressive.domain;

/**
 * Which catalog items count toward the progressive multi-item discount. Mirrors
 * the bundle module's {@code BundleEligibility} so the two automatic-discount
 * modules stay conceptually consistent — it reuses BlueQuirk's existing category
 * (= "collection") and product model, introducing no new taxonomy.
 */
public enum ProgressiveEligibility {

    /** Every product in the catalog is eligible. */
    ALL_PRODUCTS,

    /** Only products belonging to one of the configured categories (collections). */
    CATEGORY,

    /** Only the explicitly listed product ids. */
    SELECTED_PRODUCTS
}
