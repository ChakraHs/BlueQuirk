package shop.bluequirk.blue_quirk_backend.domain;

/**
 * The kind of garment a product is. Kept deliberately separate from the
 * marketing {@code Category} taxonomy (Botanical, Playful, …): a product has
 * exactly one physical type but can live in several marketing categories.
 *
 * <p>Existing rows predate this column, so Hibernate ({@code ddl-auto=update})
 * leaves it NULL. The service treats a null type as {@link #T_SHIRT}, so every
 * pre-existing product keeps behaving as a T-shirt with no migration required.
 * A one-off SQL backfill can clean the NULLs up when convenient:
 * {@code UPDATE products SET product_type = 'T_SHIRT' WHERE product_type IS NULL;}
 */
public enum ProductType {
    T_SHIRT,
    HOODIE
}
