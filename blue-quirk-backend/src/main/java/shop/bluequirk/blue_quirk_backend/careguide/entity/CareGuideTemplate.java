package shop.bluequirk.blue_quirk_backend.careguide.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import org.hibernate.annotations.ColumnDefault;

import shop.bluequirk.blue_quirk_backend.domain.ProductType;

/**
 * A reusable "Care &amp; Wear" guide template. A single template can be attached
 * to many products ({@code Product.careGuideTemplate}); editing the template
 * updates every product that uses it, since products reference it by id and the
 * storefront resolves the guide from the template at read time.
 *
 * <p>Localized content lives in child {@link CareGuideTemplateTranslation} rows
 * (one per language), exactly like {@code Product}/{@code ProductTranslation} —
 * the store's established pattern for multi-field translatable content. The
 * customer-facing section title ("Care &amp; Wear Guide" / "Entretien &amp;
 * conseils" / "العناية بالقطعة ونصائح الاستعمال") is a fixed storefront string
 * (in the i18n dictionary), not stored per template.
 */
@Entity
@Table(name = "care_guide_templates")
public class CareGuideTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Admin-facing name of the template (e.g. "T-shirt Care & Wear"). */
    @Column(nullable = false, length = 160)
    private String name;

    /**
     * Optional garment the template is intended for (T_SHIRT / HOODIE). Purely a
     * hint for the admin (drives the seeded starters and helps picking the right
     * template); attachment is never enforced against the product's own type.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "product_type", length = 32)
    private ProductType productType;

    /**
     * True for the starter templates created by the seeder. They remain fully
     * editable and deletable — this flag only stops the seeder from re-creating
     * them and lets the admin tell the starters apart.
     */
    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean seeded = false;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CareGuideTemplateTranslation> translations = new ArrayList<>();

    // --- Audit ---
    @Column(name = "created_by_email")
    private String createdByEmail;

    @Column(name = "updated_by_email")
    private String updatedByEmail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public CareGuideTemplate() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public ProductType getProductType() { return productType; }
    public void setProductType(ProductType productType) { this.productType = productType; }

    public boolean isSeeded() { return seeded; }
    public void setSeeded(boolean seeded) { this.seeded = seeded; }

    public List<CareGuideTemplateTranslation> getTranslations() { return translations; }
    public void setTranslations(List<CareGuideTemplateTranslation> translations) {
        this.translations = translations;
    }

    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }

    public String getUpdatedByEmail() { return updatedByEmail; }
    public void setUpdatedByEmail(String updatedByEmail) { this.updatedByEmail = updatedByEmail; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
