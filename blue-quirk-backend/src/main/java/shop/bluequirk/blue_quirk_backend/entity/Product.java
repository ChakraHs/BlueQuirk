package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.BatchSize;
import shop.bluequirk.blue_quirk_backend.careguide.entity.CareGuideTemplate;
import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.domain.ProductType;
import shop.bluequirk.blue_quirk_backend.entity.translation.ProductTranslation;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "products", indexes = {
        @Index(name = "idx_products_todify_template_id", columnList = "todify_template_id")
})
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Lob
    private String description; // will store HTML text

    // Physical garment type. Kept separate from the marketing `categories`
    // taxonomy (Botanical, Playful…): a product is exactly one type but can sit
    // in several categories. Nullable so existing rows migrate cleanly — the
    // service reads a null type as T_SHIRT, so every pre-existing product keeps
    // behaving as a T-shirt. Drives the storefront size guide (T-shirt vs hoodie).
    @Enumerated(EnumType.STRING)
    @Column(name = "product_type")
    private ProductType productType = ProductType.T_SHIRT;

    // Materials / composition of the product (e.g. "100% Cotton"). Purely
    // descriptive (not a variant) — shown in the storefront "Product Highlights"
    // and editable from the admin product form. Defaults to "100% Cotton" so
    // pre-existing products and new ones always have a sensible value.
    //
    // This is a denormalized display cache kept in sync with the structured
    // `materialComposition` below: when a composition is submitted, the service
    // derives this string from it ("67% Cotton, 33% Polyester") so the many
    // legacy consumers of `material` keep working unchanged.
    @Column(name = "material")
    private String material = "100% Cotton";

    // Structured material composition — the authoritative per-material breakdown
    // (Cotton 67% + Polyester 33%). Ordered so the storefront renders it in the
    // admin's chosen order; percentages are validated (>0, total 100) by the
    // service before persisting. Empty for legacy rows that predate the column;
    // the service falls back to (or parses) the `material` string above for them.
    // BatchSize keeps list endpoints from N+1-loading each product's composition.
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
        name = "product_material_components",
        joinColumns = @JoinColumn(name = "product_id")
    )
    @OrderColumn(name = "position")
    @BatchSize(size = 64)
    private List<MaterialComponent> materialComposition = new ArrayList<>();

    // Optional editorial product facts. These are product properties (not
    // purchasable variants) selected by the admin and shown beside material on
    // the storefront product page.
    @Column(name = "fabric_weight")
    private String fabricWeight;

    @Column(name = "fit")
    private String fit;

    @Column(nullable = false)
    private double price;

    // Optional "compare-at" / previous price (the strikethrough reference shown
    // when a product is on sale). PURELY a display reference — it is NEVER charged.
    // Null (or ≤ the selling price) means "no previous price" and nothing is shown
    // crossed out. Nullable so existing products migrate cleanly with no sale price.
    @Column(name = "compare_at_price")
    private Double compareAtPrice;

    // Purchase/manufacturing cost of one unit, in MAD. CONFIDENTIAL: never
    // exposed through public/customer/product/search APIs — only the admin
    // surfaces (AdminProductResponse, order financials, finance analytics) read
    // it. Defaults to 0 so pre-existing products migrate cleanly. Never negative.
    @Column(name = "cost", nullable = false)
    private double cost = 0;

    // Units in stock for this product. Defaults to 0; used for low-stock alerts
    // and the admin inventory view.
    @Column(nullable = false)
    private Integer stockQuantity = 0;

    @Enumerated(EnumType.STRING) // store as text, not number
    private ProductStatus status;

    @ManyToMany
    @JoinTable(
        name = "product_attribute_values",
        joinColumns = @JoinColumn(name = "product_id"),
        inverseJoinColumns = @JoinColumn(name = "attribute_value_id")
    )
    private Set<AttributeValue> selectedValues = new HashSet<>();

    
    @ManyToMany
    @JoinTable(
        name = "product_images",
        joinColumns = @JoinColumn(name = "product_id"),
        inverseJoinColumns = @JoinColumn(name = "image_id")
    )
    private Set<Image> images; // initially null

    // One optional featured video (embedded value; all columns nullable). A
    // product with no video simply leaves videoUrl null — existing rows are
    // unaffected. Stored/served like images (Cloudflare R2).
    @Embedded
    private ProductVideo video;

    
    
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "product_categories",
        joinColumns = @JoinColumn(name = "product_id"),
        inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    private Set<Category> categories = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ProductTranslation> translations = new HashSet<>();

    // Optional reusable "Care & Wear" guide (many products → one template). Null =
    // no guide (the storefront hides the section). Referenced by id, so editing the
    // template updates every product that uses it. Not a cascade: deleting a
    // template is blocked by CareGuideService while any product still points here.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "care_guide_template_id")
    private CareGuideTemplate careGuideTemplate;

    // --- Todify integration (all nullable; existing products are unaffected) ---
    // The linked Todify template id (UUID). Null = a normal local-only product.
    @Column(name = "todify_template_id")
    private String todifyTemplateId;

    // True when this product was created by importing a Todify template.
    @Column(name = "synced_from_todify", nullable = false)
    private boolean syncedFromTodify = false;

    // Last time synced fields were refreshed from Todify (import or template.updated).
    @Column(name = "todify_last_sync_at")
    private LocalDateTime todifyLastSyncAt;

    // When this product row was first created. Drives "newest first" ordering
    // (admin list + Trending tie-break). Nullable so pre-existing rows migrate
    // cleanly; they predate the column and sort last (oldest), with id as the
    // deterministic tie-break.
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Constructors
    public Product() {}

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public Product(String name, String description, double price, String imageUrl) {
        this.name = name;
        this.description = description;
        this.price = price;
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public ProductType getProductType() { return productType; }
    public void setProductType(ProductType productType) { this.productType = productType; }

    public String getMaterial() { return material; }
    public void setMaterial(String material) { this.material = material; }

    public List<MaterialComponent> getMaterialComposition() { return materialComposition; }
    public void setMaterialComposition(List<MaterialComponent> materialComposition) {
        this.materialComposition = materialComposition;
    }

    public String getFabricWeight() { return fabricWeight; }
    public void setFabricWeight(String fabricWeight) { this.fabricWeight = fabricWeight; }

    public String getFit() { return fit; }
    public void setFit(String fit) { this.fit = fit; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public Double getCompareAtPrice() { return compareAtPrice; }
    public void setCompareAtPrice(Double compareAtPrice) { this.compareAtPrice = compareAtPrice; }

    public double getCost() { return cost; }
    public void setCost(double cost) { this.cost = cost; }

    public Integer getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }

    public Set<AttributeValue> getSelectedValues() { return selectedValues; }
    public void setSelectedValues(Set<AttributeValue> selectedValues) { this.selectedValues = selectedValues; }
    
    public Set<Image> getImages() { return images; }
    public void setImages(Set<Image> images) { this.images = images; }

    public ProductVideo getVideo() { return video; }
    public void setVideo(ProductVideo video) { this.video = video; }

    public Set<Category> getCategories() { return categories; }
    public void setCategories(Set<Category> categories) { this.categories = categories; }
    
    public ProductStatus getStatus() {
        return status;
    }

    public void setStatus(ProductStatus status) {
        this.status = status;
    }

    public Set<ProductTranslation> getTranslations() {
        return translations;
    }

    public void setTranslations(Set<ProductTranslation> translations) {
        this.translations = translations;
    }

    public CareGuideTemplate getCareGuideTemplate() { return careGuideTemplate; }
    public void setCareGuideTemplate(CareGuideTemplate careGuideTemplate) {
        this.careGuideTemplate = careGuideTemplate;
    }

    public String getTodifyTemplateId() { return todifyTemplateId; }
    public void setTodifyTemplateId(String todifyTemplateId) { this.todifyTemplateId = todifyTemplateId; }

    public boolean isSyncedFromTodify() { return syncedFromTodify; }
    public void setSyncedFromTodify(boolean syncedFromTodify) { this.syncedFromTodify = syncedFromTodify; }

    public LocalDateTime getTodifyLastSyncAt() { return todifyLastSyncAt; }
    public void setTodifyLastSyncAt(LocalDateTime todifyLastSyncAt) { this.todifyLastSyncAt = todifyLastSyncAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
