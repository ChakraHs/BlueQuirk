package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import shop.bluequirk.blue_quirk_backend.domain.MaterialType;

/**
 * One line of a product's material composition — a {@link MaterialType} and the
 * percentage of the garment it makes up (e.g. {@code COTTON} / {@code 67}). A
 * product carries an ordered list of these ({@code Product.materialComposition}),
 * whose percentages the service validates to be positive and to total 100.
 *
 * <p>Stored as an {@code @ElementCollection} value type (no id of its own) in the
 * {@code product_material_components} table, so a product's composition is
 * replaced wholesale whenever it is edited — there is no orphan row to reconcile.
 */
@Embeddable
public class MaterialComponent {

    @Enumerated(EnumType.STRING)
    @Column(name = "material_type", nullable = false)
    private MaterialType material;

    // Whole-number percent of the garment this material makes up (1..100). The
    // per-product list is validated so every entry is > 0 and the entries sum to
    // exactly 100 before it is persisted.
    @Column(name = "percentage", nullable = false)
    private int percentage;

    public MaterialComponent() {}

    public MaterialComponent(MaterialType material, int percentage) {
        this.material = material;
        this.percentage = percentage;
    }

    public MaterialType getMaterial() { return material; }
    public void setMaterial(MaterialType material) { this.material = material; }

    public int getPercentage() { return percentage; }
    public void setPercentage(int percentage) { this.percentage = percentage; }
}
