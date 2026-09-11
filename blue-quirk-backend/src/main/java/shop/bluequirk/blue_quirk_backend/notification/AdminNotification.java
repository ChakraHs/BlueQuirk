package shop.bluequirk.blue_quirk_backend.notification;

import java.time.Instant;

import jakarta.persistence.*;

/**
 * A durable, per-admin notification (currently only "new order"). One row is
 * created per admin recipient so each admin has an independent read state, and no
 * admin can ever see another admin's notifications.
 *
 * <p>Deliberately decoupled from the {@code orders} table (no FK) — like the
 * order audit log — so a notification survives an order deletion and its creation
 * never contends with the order transaction. A few display fields (order number,
 * total, customer name, item count) are denormalized here so the notification
 * feed renders without a round-trip per order.
 *
 * <p>A unique constraint on {@code (recipient_user_id, order_id, type)} makes
 * creation idempotent: a retried request or a duplicate event can never produce
 * two "new order" notifications for the same order and admin.
 */
@Entity
@Table(name = "admin_notifications",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_admin_notif_recipient_order_type",
                columnNames = {"recipient_user_id", "order_id", "type"}),
        indexes = {
                @Index(name = "idx_admin_notif_recipient_read",
                        columnList = "recipient_user_id, read_at"),
                @Index(name = "idx_admin_notif_recipient_created",
                        columnList = "recipient_user_id, created_at"),
                @Index(name = "idx_admin_notif_order", columnList = "order_id")
        })
public class AdminNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The admin (users.id) this notification belongs to. Not a JPA relation on
     * purpose — the notification is a lightweight, decoupled record. */
    @Column(name = "recipient_user_id", nullable = false)
    private Long recipientUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AdminNotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(length = 512)
    private String message;

    // --- Denormalized order display fields (no FK to orders) ---
    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "order_number")
    private String orderNumber;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "total")
    private double total;

    @Column(name = "item_count")
    private int itemCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Null while unread; set to the read time on first read. */
    @Column(name = "read_at")
    private Instant readAt;

    public AdminNotification() {}

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRecipientUserId() { return recipientUserId; }
    public void setRecipientUserId(Long recipientUserId) { this.recipientUserId = recipientUserId; }

    public AdminNotificationType getType() { return type; }
    public void setType(AdminNotificationType type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }

    public int getItemCount() { return itemCount; }
    public void setItemCount(int itemCount) { this.itemCount = itemCount; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getReadAt() { return readAt; }
    public void setReadAt(Instant readAt) { this.readAt = readAt; }

    public boolean isRead() { return readAt != null; }
}
