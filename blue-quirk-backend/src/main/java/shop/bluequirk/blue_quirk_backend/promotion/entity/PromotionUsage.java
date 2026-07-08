package shop.bluequirk.blue_quirk_backend.promotion.entity;

import java.time.Instant;

import jakarta.persistence.*;

/**
 * One redemption of a promotion by one order. Append-only. Keeps the customer
 * email/user id denormalized (not just an FK) so per-customer usage can be
 * counted for guests too, and history survives customer/order deletion. Feeds
 * the analytics aggregates (revenue, discount given, orders using coupons).
 */
@Entity
@Table(name = "promotion_usages", indexes = {
        @Index(name = "idx_promo_usage_promotion", columnList = "promotion_id"),
        @Index(name = "idx_promo_usage_email", columnList = "customer_email"),
        @Index(name = "idx_promo_usage_order", columnList = "order_id")
})
public class PromotionUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "promotion_id", nullable = false)
    private Promotion promotion;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "customer_id")
    private Long customerId;

    /** Lower-cased email of the redeeming customer; used for per-customer limits. */
    @Column(name = "customer_email", length = 320)
    private String customerEmail;

    @Column(name = "discount_amount", nullable = false)
    private double discountAmount;

    /** The order's original (pre-discount) grand total — the revenue attributed to this redemption. */
    @Column(name = "order_total", nullable = false)
    private double orderTotal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { this.createdAt = Instant.now(); }

    public PromotionUsage() {}

    public Long getId() { return id; }

    public Promotion getPromotion() { return promotion; }
    public void setPromotion(Promotion promotion) { this.promotion = promotion; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public double getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(double discountAmount) { this.discountAmount = discountAmount; }

    public double getOrderTotal() { return orderTotal; }
    public void setOrderTotal(double orderTotal) { this.orderTotal = orderTotal; }

    public Instant getCreatedAt() { return createdAt; }
}
