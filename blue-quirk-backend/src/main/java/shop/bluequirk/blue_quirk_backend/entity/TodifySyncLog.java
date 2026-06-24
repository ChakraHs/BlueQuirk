package shop.bluequirk.blue_quirk_backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

/**
 * Audit trail for the Todify integration: outbound API requests/responses,
 * errors, inbound webhook events, and retry attempts. Read-only from the admin
 * "Sync Logs" page. The {@code deliveryId} column is indexed and used to
 * deduplicate webhook retries (idempotency).
 */
@Entity
@Table(name = "todify_sync_logs", indexes = {
        @Index(name = "idx_todify_logs_order_id", columnList = "order_id"),
        @Index(name = "idx_todify_logs_delivery_id", columnList = "delivery_id"),
        @Index(name = "idx_todify_logs_created_at", columnList = "created_at"),
        @Index(name = "idx_todify_logs_type", columnList = "type")
})
public class TodifySyncLog {

    public enum Type { REQUEST, RESPONSE, ERROR, WEBHOOK, RETRY }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    // Logical action, e.g. "submitOrder", "getOrder", "importTemplate",
    // "order.status_changed".
    @Column(length = 100)
    private String event;

    // "OUTBOUND" (we called Todify) or "INBOUND" (Todify called us).
    @Column(length = 16)
    private String direction;

    // Related local order id / Todify template id, when applicable.
    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "template_id")
    private String templateId;

    @Column(name = "http_status")
    private Integer httpStatus;

    // @Lob alone → LONGTEXT on MariaDB; column names are derived as snake_case
    // (request_body / response_body / error_message). An explicit @Column would
    // force the default length 255 and downgrade these to tinytext.
    @Lob
    private String requestBody;

    @Lob
    private String responseBody;

    @Lob
    private String errorMessage;

    // Webhook X-Todify-Delivery-Id, for idempotent retry handling.
    @Column(name = "delivery_id", length = 100)
    private String deliveryId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public TodifySyncLog() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }

    public String getEvent() { return event; }
    public void setEvent(String event) { this.event = event; }

    public String getDirection() { return direction; }
    public void setDirection(String direction) { this.direction = direction; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getTemplateId() { return templateId; }
    public void setTemplateId(String templateId) { this.templateId = templateId; }

    public Integer getHttpStatus() { return httpStatus; }
    public void setHttpStatus(Integer httpStatus) { this.httpStatus = httpStatus; }

    public String getRequestBody() { return requestBody; }
    public void setRequestBody(String requestBody) { this.requestBody = requestBody; }

    public String getResponseBody() { return responseBody; }
    public void setResponseBody(String responseBody) { this.responseBody = responseBody; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public String getDeliveryId() { return deliveryId; }
    public void setDeliveryId(String deliveryId) { this.deliveryId = deliveryId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
