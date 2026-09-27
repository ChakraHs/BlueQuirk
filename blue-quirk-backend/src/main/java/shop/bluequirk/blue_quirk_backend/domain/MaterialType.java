package shop.bluequirk.blue_quirk_backend.domain;

/**
 * A single material a product can be made of. Combined with a percentage in
 * {@link shop.bluequirk.blue_quirk_backend.entity.MaterialComponent} to model a
 * structured composition (e.g. Cotton 67% + Polyester 33%).
 *
 * <p>Only the materials the shop actually uses today are listed; the enum is the
 * single extension point — adding {@code ELASTANE}, {@code WOOL}, … here (plus a
 * localized label on the storefront) is all that is needed to support a new one,
 * with no schema change (the value is stored as its {@code EnumType.STRING} name).
 */
public enum MaterialType {
    COTTON,
    POLYESTER
}
