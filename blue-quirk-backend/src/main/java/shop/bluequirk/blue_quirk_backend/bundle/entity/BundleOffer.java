package shop.bluequirk.blue_quirk_backend.bundle.entity;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.*;

import shop.bluequirk.blue_quirk_backend.bundle.domain.BundleEligibility;
import shop.bluequirk.blue_quirk_backend.bundle.domain.BundlePricingMethod;

/**
 * A configurable quantity / "build-your-set" bundle offer. One row per campaign
 * (e.g. "Build Your Bloom Set"). Everything the storefront and the pricing engine
 * need is admin-configurable here — nothing about the offer is hard-coded.
 *
 * <p>The offer is <b>automatic</b> (no coupon code): the pricing engine detects an
 * eligible cart and applies the best offer server-side. It is a sibling of the
 * coupon-driven {@code promotion} module, not a replacement — the two compose
 * (bundle first, coupon on the reduced subtotal).
 *
 * <p>Deliberately future-ready: the group-based engine already generalizes to
 * multi-tier ("Buy 2 → 349, Buy 3 → 449") by adding tier rows keyed by quantity
 * later without reworking this entity or the order integration.
 */
@Entity
@Table(name = "bundle_offers", indexes = {
        @Index(name = "idx_bundle_offers_active", columnList = "active")
})
public class BundleOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Customer-facing offer name, e.g. "Build Your Bloom Set". */
    @Column(nullable = false)
    private String name;

    /** Internal-only note; never shown to customers. */
    @Column(length = 1000)
    private String description;

    /** Admin enable/disable switch. Disabled offers never affect pricing or display. */
    @Column(nullable = false)
    private boolean active = true;

    // --- Trigger ---
    /** Minimum number of eligible units that make up one bundle (≥ 2). */
    @Column(name = "min_quantity", nullable = false)
    private int minQuantity = 2;

    // --- Pricing ---
    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_method", nullable = false, length = 32)
    private BundlePricingMethod pricingMethod = BundlePricingMethod.FIXED_BUNDLE_PRICE;

    /**
     * The pricing value, interpreted per completed group by {@link #pricingMethod}:
     * a flat group price (FIXED_BUNDLE_PRICE), a percentage 0–100
     * (PERCENTAGE_DISCOUNT) or a flat amount off (FIXED_AMOUNT_DISCOUNT).
     */
    @Column(name = "bundle_value", nullable = false)
    private double bundleValue;

    // --- Eligibility (product scope) ---
    @Enumerated(EnumType.STRING)
    @Column(name = "eligibility", nullable = false, length = 32)
    private BundleEligibility eligibility = BundleEligibility.CATEGORY;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "bundle_offer_categories",
            joinColumns = @JoinColumn(name = "bundle_offer_id"))
    @Column(name = "category_id")
    private Set<Long> eligibleCategoryIds = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "bundle_offer_products",
            joinColumns = @JoinColumn(name = "bundle_offer_id"))
    @Column(name = "product_id")
    private Set<Long> eligibleProductIds = new HashSet<>();

    // --- Mix & match rules ---
    /**
     * Whether a single bundle may combine <b>different</b> eligible products
     * (mix & match). Bloom = true. When false, each bundle must be the same product.
     */
    @Column(name = "allow_mixing", nullable = false)
    private boolean allowMixing = true;

    /**
     * Whether two units of the <b>same</b> product may count toward one bundle. When
     * false, a bundle must be made of distinct products (only meaningful with
     * mixing on). Bloom default = true (2 identical designs still qualify).
     */
    @Column(name = "allow_same_product", nullable = false)
    private boolean allowSameProduct = true;

    // --- Display toggles ---
    @Column(name = "display_on_product", nullable = false)
    private boolean displayOnProduct = true;

    @Column(name = "display_in_cart", nullable = false)
    private boolean displayInCart = true;

    /** Tie-breaker when several offers could apply (higher wins before max-discount). */
    @Column(name = "priority", nullable = false)
    private int priority = 0;

    // --- Denormalized analytics aggregates (maintained at order time) ---
    @Column(name = "usage_count", nullable = false)
    private int usageCount = 0;

    @Column(name = "total_discount_given", nullable = false)
    private double totalDiscountGiven = 0;

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

    public BundleOffer() {}

    // --- Getters & setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public int getMinQuantity() { return minQuantity; }
    public void setMinQuantity(int minQuantity) { this.minQuantity = minQuantity; }

    public BundlePricingMethod getPricingMethod() { return pricingMethod; }
    public void setPricingMethod(BundlePricingMethod pricingMethod) { this.pricingMethod = pricingMethod; }

    public double getBundleValue() { return bundleValue; }
    public void setBundleValue(double bundleValue) { this.bundleValue = bundleValue; }

    public BundleEligibility getEligibility() { return eligibility; }
    public void setEligibility(BundleEligibility eligibility) { this.eligibility = eligibility; }

    public Set<Long> getEligibleCategoryIds() { return eligibleCategoryIds; }
    public void setEligibleCategoryIds(Set<Long> eligibleCategoryIds) { this.eligibleCategoryIds = eligibleCategoryIds; }

    public Set<Long> getEligibleProductIds() { return eligibleProductIds; }
    public void setEligibleProductIds(Set<Long> eligibleProductIds) { this.eligibleProductIds = eligibleProductIds; }

    public boolean isAllowMixing() { return allowMixing; }
    public void setAllowMixing(boolean allowMixing) { this.allowMixing = allowMixing; }

    public boolean isAllowSameProduct() { return allowSameProduct; }
    public void setAllowSameProduct(boolean allowSameProduct) { this.allowSameProduct = allowSameProduct; }

    public boolean isDisplayOnProduct() { return displayOnProduct; }
    public void setDisplayOnProduct(boolean displayOnProduct) { this.displayOnProduct = displayOnProduct; }

    public boolean isDisplayInCart() { return displayInCart; }
    public void setDisplayInCart(boolean displayInCart) { this.displayInCart = displayInCart; }

    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }

    public int getUsageCount() { return usageCount; }
    public void setUsageCount(int usageCount) { this.usageCount = usageCount; }

    public double getTotalDiscountGiven() { return totalDiscountGiven; }
    public void setTotalDiscountGiven(double totalDiscountGiven) { this.totalDiscountGiven = totalDiscountGiven; }

    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }

    public String getUpdatedByEmail() { return updatedByEmail; }
    public void setUpdatedByEmail(String updatedByEmail) { this.updatedByEmail = updatedByEmail; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
