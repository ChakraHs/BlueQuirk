package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.domain.PaymentStatus;
import shop.bluequirk.blue_quirk_backend.domain.TodifySyncState;

@Entity
@Table(name = "orders", indexes = {
        @Index(name = "idx_orders_todify_order_id", columnList = "todify_order_id"),
        @Index(name = "idx_orders_todify_sync_state", columnList = "todify_sync_state")
})
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Human-friendly reference shown to customers and used for public tracking,
    // e.g. "BQ-2026-000123". Assigned once, right after the row gets its id.
    @Column(name = "order_number", unique = true)
    private String orderNumber;

    // Optional login account. Null for guest checkouts (no forced registration).
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    // The customer this order belongs to (created or reused by email at checkout).
    @ManyToOne
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    // --- Cash-on-delivery shipping details (snapshot at order time) ---
    @Column(nullable = false)
    private String customerName;

    private String firstName;
    private String lastName;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false, length = 512)
    private String address;

    private String postalCode;

    @Column(length = 1000)
    private String note;

    // Snapshot of the customer's email at order time (for confirmation mail).
    private String email;

    @Column(nullable = false)
    private String paymentMethod = "COD";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    // Why the order was cancelled (admin-selected reason, shown to the customer
    // in the cancellation email). Null unless the order is/was cancelled.
    @Column(length = 500)
    private String cancellationReason;

    // Carrier tracking number, set once the order ships.
    private String trackingNumber;

    // Estimated delivery date shown to the customer on the tracking page.
    private LocalDate estimatedDelivery;

    private double subtotal;
    private double shippingFee;
    private double total;

    // --- Financial snapshot (immutable accounting record) ---------------------
    // Σ(product cost × quantity) at order time — the goods cost of this order.
    // Frozen: editing product costs later must never change historical profit.
    // Gross profit is derived (subtotal − costTotal), so it is computed on read
    // rather than stored, keeping a single source of truth.
    @Column(name = "cost_total", nullable = false)
    private double costTotal = 0;

    // --- Promotion / coupon (all backend-computed; persisted for invoices + analytics) ---
    // Pre-discount grand total (subtotal + shipping) at order time.
    @Column(name = "original_total", nullable = false)
    private double originalTotal;

    @Column(name = "discount_amount", nullable = false)
    private double discountAmount;

    // Effective discount as a percentage of the goods subtotal (0 when none).
    @Column(name = "discount_percentage", nullable = false)
    private double discountPercentage;

    // The coupon code the customer applied, snapshotted (null if none).
    @Column(name = "applied_coupon_code")
    private String appliedCouponCode;

    // The promotion that was applied (null if none). Kept as a plain id — no FK —
    // so a promotion can be deleted without orphaning historical orders.
    @Column(name = "promotion_id")
    private Long promotionId;

    private LocalDateTime orderDate;

    // --- Todify fulfillment sync (all nullable; local order is source of truth) ---
    // Todify's order id and human reference, set once the order is accepted.
    @Column(name = "todify_order_id")
    private String todifyOrderId;

    @Column(name = "todify_reference_code")
    private String todifyReferenceCode;

    // Raw Todify status string (e.g. "in_production", "shipped").
    @Column(name = "todify_status")
    private String todifyStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "todify_sync_state")
    private TodifySyncState todifySyncState = TodifySyncState.NOT_APPLICABLE;

    @Column(name = "todify_last_sync_at")
    private LocalDateTime todifyLastSyncAt;

    // @Lob alone maps to LONGTEXT on MariaDB (column name derived as
    // todify_error_message). Adding @Column would force length 255 → tinytext.
    @Lob
    private String todifyErrorMessage;

    @Column(name = "todify_sync_attempts", nullable = false)
    private int todifySyncAttempts = 0;

    public Order() {}

    public void addItem(OrderItem item) {
        item.setOrder(this);
        this.items.add(item);
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }

    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getCancellationReason() { return cancellationReason; }
    public void setCancellationReason(String cancellationReason) { this.cancellationReason = cancellationReason; }

    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }

    public LocalDate getEstimatedDelivery() { return estimatedDelivery; }
    public void setEstimatedDelivery(LocalDate estimatedDelivery) { this.estimatedDelivery = estimatedDelivery; }

    public double getSubtotal() { return subtotal; }
    public void setSubtotal(double subtotal) { this.subtotal = subtotal; }

    public double getShippingFee() { return shippingFee; }
    public void setShippingFee(double shippingFee) { this.shippingFee = shippingFee; }

    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }

    public double getCostTotal() { return costTotal; }
    public void setCostTotal(double costTotal) { this.costTotal = costTotal; }

    public double getOriginalTotal() { return originalTotal; }
    public void setOriginalTotal(double originalTotal) { this.originalTotal = originalTotal; }

    public double getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(double discountAmount) { this.discountAmount = discountAmount; }

    public double getDiscountPercentage() { return discountPercentage; }
    public void setDiscountPercentage(double discountPercentage) { this.discountPercentage = discountPercentage; }

    public String getAppliedCouponCode() { return appliedCouponCode; }
    public void setAppliedCouponCode(String appliedCouponCode) { this.appliedCouponCode = appliedCouponCode; }

    public Long getPromotionId() { return promotionId; }
    public void setPromotionId(Long promotionId) { this.promotionId = promotionId; }

    public LocalDateTime getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDateTime orderDate) { this.orderDate = orderDate; }

    public String getTodifyOrderId() { return todifyOrderId; }
    public void setTodifyOrderId(String todifyOrderId) { this.todifyOrderId = todifyOrderId; }

    public String getTodifyReferenceCode() { return todifyReferenceCode; }
    public void setTodifyReferenceCode(String todifyReferenceCode) { this.todifyReferenceCode = todifyReferenceCode; }

    public String getTodifyStatus() { return todifyStatus; }
    public void setTodifyStatus(String todifyStatus) { this.todifyStatus = todifyStatus; }

    public TodifySyncState getTodifySyncState() { return todifySyncState; }
    public void setTodifySyncState(TodifySyncState todifySyncState) { this.todifySyncState = todifySyncState; }

    public LocalDateTime getTodifyLastSyncAt() { return todifyLastSyncAt; }
    public void setTodifyLastSyncAt(LocalDateTime todifyLastSyncAt) { this.todifyLastSyncAt = todifyLastSyncAt; }

    public String getTodifyErrorMessage() { return todifyErrorMessage; }
    public void setTodifyErrorMessage(String todifyErrorMessage) { this.todifyErrorMessage = todifyErrorMessage; }

    public int getTodifySyncAttempts() { return todifySyncAttempts; }
    public void setTodifySyncAttempts(int todifySyncAttempts) { this.todifySyncAttempts = todifySyncAttempts; }
}
