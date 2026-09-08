package shop.bluequirk.blue_quirk_backend.progressive.entity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

import org.hibernate.annotations.ColumnDefault;

import jakarta.persistence.*;

import shop.bluequirk.blue_quirk_backend.progressive.domain.ProgressiveCountingMethod;
import shop.bluequirk.blue_quirk_backend.progressive.domain.ProgressiveEligibility;

/**
 * Singleton row (id = 1) holding the admin-configurable <b>progressive multi-item
 * discount</b>: the more eligible items a customer adds to one order, the more they
 * save. Persisting the config in the DB — like {@code StoreSettings} /
 * {@code IntegrationSettings} — lets the admin tune the campaign at runtime from the
 * dashboard with no redeploy.
 *
 * <p>The discount is <b>automatic</b> (no coupon code): the pricing engine detects
 * eligible items and applies the reward server-side. It is a sibling of the
 * coupon-driven {@code promotion} module and the {@code bundle} module — the three
 * compose in a documented order (bundle → progressive → coupon), never a parallel
 * pricing path.
 *
 * <p>Deliberately future-ready (spec §23): the linear "per additional item" reward
 * is one strategy of a tier-capable engine. Adding tiered rewards ("2→5%, 3→10%")
 * later means new columns/rows, not a rewrite of the order integration.
 */
@Entity
@Table(name = "progressive_discount_settings")
public class ProgressiveDiscountSettings {

    /** Fixed singleton id; there is ever only one progressive-discount config row. */
    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    /** Master enable/disable. When off, the discount never applies nor displays. */
    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean enabled = false;

    // --- Reward ---
    /**
     * Flat currency amount unlocked per <b>additional</b> eligible item beyond the
     * first. Discount = (eligibleItemCount − 1) × this, capped at {@link #maxDiscount}.
     */
    @Column(name = "discount_per_additional_item", nullable = false)
    @ColumnDefault("0")
    private double discountPerAdditionalItem = 0;

    /**
     * Optional cap on the total progressive discount (store currency). 0 = uncapped.
     * Example: 100 DH ceiling.
     */
    @Column(name = "max_discount", nullable = false)
    @ColumnDefault("0")
    private double maxDiscount = 0;

    /**
     * Minimum eligible-item count (per {@link #countingMethod}) required before the
     * discount activates at all. Defaults to 2 (a single item never earns anything).
     */
    @Column(name = "min_items", nullable = false)
    @ColumnDefault("2")
    private int minItems = 2;

    // --- Counting ---
    @Enumerated(EnumType.STRING)
    @Column(name = "counting_method", nullable = false, length = 32)
    private ProgressiveCountingMethod countingMethod = ProgressiveCountingMethod.UNIQUE_PRODUCTS;

    // --- Eligibility (product scope) ---
    @Enumerated(EnumType.STRING)
    @Column(name = "eligibility", nullable = false, length = 32)
    private ProgressiveEligibility eligibility = ProgressiveEligibility.ALL_PRODUCTS;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "progressive_discount_categories",
            joinColumns = @JoinColumn(name = "settings_id"))
    @Column(name = "category_id")
    private Set<Long> eligibleCategoryIds = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "progressive_discount_products",
            joinColumns = @JoinColumn(name = "settings_id"))
    @Column(name = "product_id")
    private Set<Long> eligibleProductIds = new HashSet<>();

    // --- Stacking policy ---
    /** May the progressive discount stack on top of an automatic bundle discount? */
    @Column(name = "combine_with_bundle", nullable = false)
    @ColumnDefault("true")
    private boolean combineWithBundle = true;

    /** May the progressive discount stack with a customer-entered coupon? */
    @Column(name = "combine_with_coupons", nullable = false)
    @ColumnDefault("false")
    private boolean combineWithCoupons = false;

    // --- Campaign window (optional; null = always on while enabled) ---
    @Column(name = "starts_on")
    private LocalDate startsOn;

    @Column(name = "ends_on")
    private LocalDate endsOn;

    // --- Display toggles ---
    @Column(name = "display_on_product", nullable = false)
    @ColumnDefault("true")
    private boolean displayOnProduct = true;

    @Column(name = "display_in_cart", nullable = false)
    @ColumnDefault("true")
    private boolean displayInCart = true;

    /**
     * Monotonic rule version, bumped on every save. Frozen onto each order so a
     * historical order records exactly which configuration produced its discount —
     * later edits never rewrite past orders (spec §13).
     */
    @Column(name = "version", nullable = false)
    @ColumnDefault("1")
    private int version = 1;

    // --- Denormalized analytics aggregates (maintained at order time) ---
    @Column(name = "usage_count", nullable = false)
    @ColumnDefault("0")
    private int usageCount = 0;

    @Column(name = "total_discount_given", nullable = false)
    @ColumnDefault("0")
    private double totalDiscountGiven = 0;

    // --- Audit ---
    @Column(name = "updated_by_email")
    private String updatedByEmail;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public ProgressiveDiscountSettings() {}

    // --- Getters & setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public double getDiscountPerAdditionalItem() { return discountPerAdditionalItem; }
    public void setDiscountPerAdditionalItem(double v) { this.discountPerAdditionalItem = v; }

    public double getMaxDiscount() { return maxDiscount; }
    public void setMaxDiscount(double maxDiscount) { this.maxDiscount = maxDiscount; }

    public int getMinItems() { return minItems; }
    public void setMinItems(int minItems) { this.minItems = minItems; }

    public ProgressiveCountingMethod getCountingMethod() { return countingMethod; }
    public void setCountingMethod(ProgressiveCountingMethod m) { this.countingMethod = m; }

    public ProgressiveEligibility getEligibility() { return eligibility; }
    public void setEligibility(ProgressiveEligibility e) { this.eligibility = e; }

    public Set<Long> getEligibleCategoryIds() { return eligibleCategoryIds; }
    public void setEligibleCategoryIds(Set<Long> ids) { this.eligibleCategoryIds = ids; }

    public Set<Long> getEligibleProductIds() { return eligibleProductIds; }
    public void setEligibleProductIds(Set<Long> ids) { this.eligibleProductIds = ids; }

    public boolean isCombineWithBundle() { return combineWithBundle; }
    public void setCombineWithBundle(boolean v) { this.combineWithBundle = v; }

    public boolean isCombineWithCoupons() { return combineWithCoupons; }
    public void setCombineWithCoupons(boolean v) { this.combineWithCoupons = v; }

    public LocalDate getStartsOn() { return startsOn; }
    public void setStartsOn(LocalDate startsOn) { this.startsOn = startsOn; }

    public LocalDate getEndsOn() { return endsOn; }
    public void setEndsOn(LocalDate endsOn) { this.endsOn = endsOn; }

    public boolean isDisplayOnProduct() { return displayOnProduct; }
    public void setDisplayOnProduct(boolean v) { this.displayOnProduct = v; }

    public boolean isDisplayInCart() { return displayInCart; }
    public void setDisplayInCart(boolean v) { this.displayInCart = v; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public int getUsageCount() { return usageCount; }
    public void setUsageCount(int usageCount) { this.usageCount = usageCount; }

    public double getTotalDiscountGiven() { return totalDiscountGiven; }
    public void setTotalDiscountGiven(double v) { this.totalDiscountGiven = v; }

    public String getUpdatedByEmail() { return updatedByEmail; }
    public void setUpdatedByEmail(String updatedByEmail) { this.updatedByEmail = updatedByEmail; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
