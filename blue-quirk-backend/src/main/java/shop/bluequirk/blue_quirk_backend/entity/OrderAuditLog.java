package shop.bluequirk.blue_quirk_backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

/**
 * Durable audit trail for order lifecycle actions — cancellation, Todify
 * cancellation request/response/retry, and permanent deletion. Intentionally
 * decoupled from the {@code orders} table (a plain {@code orderId} + snapshotted
 * {@code orderNumber}, no FK) so the record <b>survives the order's deletion</b>:
 * "who deleted order BQ-… and when" must remain after the order row is gone.
 *
 * <p>Complements {@link TodifySyncLog} (raw HTTP request/response bodies for
 * debugging); this table is the higher-level "who did what, when, and why" log.
 */
@Entity
@Table(name = "order_audit_logs", indexes = {
        @Index(name = "idx_order_audit_order_id", columnList = "order_id"),
        @Index(name = "idx_order_audit_created_at", columnList = "created_at"),
        @Index(name = "idx_order_audit_action", columnList = "action")
})
public class OrderAuditLog {

    public enum Action {
        /** Admin cancelled the order (reason + actor recorded). */
        CANCELLED,
        /** A cancellation request was sent to Todify. */
        TODIFY_CANCEL_REQUESTED,
        /** Todify confirmed the cancellation. */
        TODIFY_CANCEL_CONFIRMED,
        /** Todify rejected / was unavailable for the cancellation (retryable). */
        TODIFY_CANCEL_FAILED,
        /** A manual/admin retry of the Todify cancellation was triggered. */
        TODIFY_CANCEL_RETRIED,
        /** Admin switched the order to manual (self-managed) fulfillment. */
        TODIFY_SET_MANUAL,
        /** Admin switched the order back to automatic Todify sync. */
        TODIFY_SET_AUTO,
        /** Admin linked the order to an existing Todify order created by hand. */
        TODIFY_LINKED,
        /** The order was permanently deleted. */
        DELETED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Plain id + number snapshot — NO foreign key, so the row outlives the order.
    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "order_number", length = 40)
    private String orderNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Action action;

    // Who performed the action: admin email, or "todify" / "system" for automated
    // (inbound webhook / scheduled) actions.
    @Column(name = "performed_by", length = 320)
    private String performedBy;

    // Optional cancellation reason / short human note.
    @Column(length = 500)
    private String reason;

    // HTTP status of the related Todify call, when applicable.
    @Column(name = "http_status")
    private Integer httpStatus;

    // @Lob alone → LONGTEXT on MariaDB (column derived as `detail`); an explicit
    // @Column would force length 255 → tinytext. Free-form context (response body,
    // error message, retry attempt count, …).
    @Lob
    private String detail;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public OrderAuditLog() {}

    public OrderAuditLog(Long orderId, String orderNumber, Action action,
                         String performedBy, String reason, Integer httpStatus, String detail) {
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.action = action;
        this.performedBy = performedBy;
        this.reason = reason;
        this.httpStatus = httpStatus;
        this.detail = detail;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public Action getAction() { return action; }
    public void setAction(Action action) { this.action = action; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Integer getHttpStatus() { return httpStatus; }
    public void setHttpStatus(Integer httpStatus) { this.httpStatus = httpStatus; }

    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
