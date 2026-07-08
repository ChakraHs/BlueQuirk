package shop.bluequirk.blue_quirk_backend.promotion.entity;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.*;

import shop.bluequirk.blue_quirk_backend.promotion.domain.CustomerEligibility;
import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.domain.PromotionLifecycleStatus;
import shop.bluequirk.blue_quirk_backend.promotion.domain.PromotionScope;

/**
 * A promotion / coupon definition. One row per campaign. The coupon {@code code}
 * is what customers enter at checkout (unique, stored upper-cased). Redemptions
 * are recorded as {@link PromotionUsage} rows; {@code usageCount} and the
 * analytics totals are denormalized aggregates maintained at redemption time so
 * the list and stats endpoints stay cheap.
 *
 * <p>The entity is deliberately future-ready: the {@code scope}, restriction id
 * sets, {@code freeShipping} and Buy-X-Get-Y columns already exist so new
 * promotion types (see {@link DiscountType}) can be introduced without a schema
 * migration or service redesign.
 */
@Entity
@Table(name = "promotions", indexes = {
        @Index(name = "idx_promotions_code", columnList = "code", unique = true),
        @Index(name = "idx_promotions_active", columnList = "active")
})
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- General ---
    @Column(nullable = false)
    private String name;

    /** Internal-only note; never shown to customers. */
    @Column(length = 1000)
    private String description;

    /** Coupon code the customer enters. Unique, stored upper-cased. */
    @Column(nullable = false, unique = true, length = 64)
    private String code;

    /** Admin enable/disable switch (independent of the validity window). */
    @Column(nullable = false)
    private boolean active = true;

    // --- Discount ---
    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 32)
    private DiscountType discountType = DiscountType.PERCENTAGE;

    /** Percentage (0–100) for PERCENTAGE, or a flat amount for FIXED_AMOUNT. */
    @Column(name = "discount_value", nullable = false)
    private double discountValue;

    // --- Validity window (both optional: null start = immediately, null end = forever) ---
    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    // --- Usage limits (null = unlimited) ---
    @Column(name = "max_global_usage")
    private Integer maxGlobalUsage;

    @Column(name = "max_usage_per_customer")
    private Integer maxUsagePerCustomer;

    // --- Conditions ---
    @Column(name = "min_order_amount")
    private Double minOrderAmount;

    /** Caps the discount for PERCENTAGE promotions (null = uncapped). */
    @Column(name = "max_discount_amount")
    private Double maxDiscountAmount;

    // --- Customer restrictions ---
    @Enumerated(EnumType.STRING)
    @Column(name = "customer_eligibility", nullable = false, length = 32)
    private CustomerEligibility customerEligibility = CustomerEligibility.ALL_CUSTOMERS;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "promotion_customers",
            joinColumns = @JoinColumn(name = "promotion_id"))
    @Column(name = "customer_id")
    private Set<Long> eligibleCustomerIds = new HashSet<>();

    // --- Future-ready scope / restrictions (unused by the engine today) ---
    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 32)
    private PromotionScope scope = PromotionScope.ENTIRE_ORDER;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "promotion_categories",
            joinColumns = @JoinColumn(name = "promotion_id"))
    @Column(name = "category_id")
    private Set<Long> restrictedCategoryIds = new HashSet<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "promotion_products",
            joinColumns = @JoinColumn(name = "promotion_id"))
    @Column(name = "product_id")
    private Set<Long> restrictedProductIds = new HashSet<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "promotion_brands",
            joinColumns = @JoinColumn(name = "promotion_id"))
    @Column(name = "brand_id")
    private Set<Long> restrictedBrandIds = new HashSet<>();

    /** Reserved: also waive shipping. Not yet applied by the engine. */
    @Column(name = "free_shipping", nullable = false)
    private boolean freeShipping = false;

    /** Reserved: Buy X quantity to trigger the Get-Y reward. */
    @Column(name = "buy_x_quantity")
    private Integer buyXQuantity;

    /** Reserved: Get Y quantity as the reward. */
    @Column(name = "get_y_quantity")
    private Integer getYQuantity;

    // --- Denormalized analytics aggregates (maintained at redemption time) ---
    @Column(name = "usage_count", nullable = false)
    private int usageCount = 0;

    @Column(name = "total_discount_given", nullable = false)
    private double totalDiscountGiven = 0;

    @Column(name = "total_revenue_generated", nullable = false)
    private double totalRevenueGenerated = 0;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    // --- Audit ---
    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_by_email")
    private String createdByEmail;

    @Column(name = "updated_by")
    private Long updatedBy;

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

    public Promotion() {}

    /**
     * Derived, non-persisted status used for the admin badge. Order matters:
     * disabled beats scheduling, expiry beats exhaustion, etc.
     */
    @Transient
    public PromotionLifecycleStatus getLifecycleStatus() {
        if (!active) return PromotionLifecycleStatus.DISABLED;
        LocalDateTime now = LocalDateTime.now();
        if (endDate != null && now.isAfter(endDate)) return PromotionLifecycleStatus.EXPIRED;
        if (maxGlobalUsage != null && usageCount >= maxGlobalUsage) {
            return PromotionLifecycleStatus.EXHAUSTED;
        }
        if (startDate != null && now.isBefore(startDate)) return PromotionLifecycleStatus.SCHEDULED;
        return PromotionLifecycleStatus.ACTIVE;
    }

    // --- Getters & setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public DiscountType getDiscountType() { return discountType; }
    public void setDiscountType(DiscountType discountType) { this.discountType = discountType; }

    public double getDiscountValue() { return discountValue; }
    public void setDiscountValue(double discountValue) { this.discountValue = discountValue; }

    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }

    public LocalDateTime getEndDate() { return endDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }

    public Integer getMaxGlobalUsage() { return maxGlobalUsage; }
    public void setMaxGlobalUsage(Integer maxGlobalUsage) { this.maxGlobalUsage = maxGlobalUsage; }

    public Integer getMaxUsagePerCustomer() { return maxUsagePerCustomer; }
    public void setMaxUsagePerCustomer(Integer maxUsagePerCustomer) { this.maxUsagePerCustomer = maxUsagePerCustomer; }

    public Double getMinOrderAmount() { return minOrderAmount; }
    public void setMinOrderAmount(Double minOrderAmount) { this.minOrderAmount = minOrderAmount; }

    public Double getMaxDiscountAmount() { return maxDiscountAmount; }
    public void setMaxDiscountAmount(Double maxDiscountAmount) { this.maxDiscountAmount = maxDiscountAmount; }

    public CustomerEligibility getCustomerEligibility() { return customerEligibility; }
    public void setCustomerEligibility(CustomerEligibility customerEligibility) { this.customerEligibility = customerEligibility; }

    public Set<Long> getEligibleCustomerIds() { return eligibleCustomerIds; }
    public void setEligibleCustomerIds(Set<Long> eligibleCustomerIds) { this.eligibleCustomerIds = eligibleCustomerIds; }

    public PromotionScope getScope() { return scope; }
    public void setScope(PromotionScope scope) { this.scope = scope; }

    public Set<Long> getRestrictedCategoryIds() { return restrictedCategoryIds; }
    public void setRestrictedCategoryIds(Set<Long> restrictedCategoryIds) { this.restrictedCategoryIds = restrictedCategoryIds; }

    public Set<Long> getRestrictedProductIds() { return restrictedProductIds; }
    public void setRestrictedProductIds(Set<Long> restrictedProductIds) { this.restrictedProductIds = restrictedProductIds; }

    public Set<Long> getRestrictedBrandIds() { return restrictedBrandIds; }
    public void setRestrictedBrandIds(Set<Long> restrictedBrandIds) { this.restrictedBrandIds = restrictedBrandIds; }

    public boolean isFreeShipping() { return freeShipping; }
    public void setFreeShipping(boolean freeShipping) { this.freeShipping = freeShipping; }

    public Integer getBuyXQuantity() { return buyXQuantity; }
    public void setBuyXQuantity(Integer buyXQuantity) { this.buyXQuantity = buyXQuantity; }

    public Integer getGetYQuantity() { return getYQuantity; }
    public void setGetYQuantity(Integer getYQuantity) { this.getYQuantity = getYQuantity; }

    public int getUsageCount() { return usageCount; }
    public void setUsageCount(int usageCount) { this.usageCount = usageCount; }

    public double getTotalDiscountGiven() { return totalDiscountGiven; }
    public void setTotalDiscountGiven(double totalDiscountGiven) { this.totalDiscountGiven = totalDiscountGiven; }

    public double getTotalRevenueGenerated() { return totalRevenueGenerated; }
    public void setTotalRevenueGenerated(double totalRevenueGenerated) { this.totalRevenueGenerated = totalRevenueGenerated; }

    public Instant getLastUsedAt() { return lastUsedAt; }
    public void setLastUsedAt(Instant lastUsedAt) { this.lastUsedAt = lastUsedAt; }

    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }

    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }

    public String getUpdatedByEmail() { return updatedByEmail; }
    public void setUpdatedByEmail(String updatedByEmail) { this.updatedByEmail = updatedByEmail; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
