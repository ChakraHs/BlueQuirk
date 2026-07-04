package shop.bluequirk.blue_quirk_backend.analytics.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import shop.bluequirk.blue_quirk_backend.analytics.domain.EventType;

/**
 * A generic, extensible commerce/funnel event (add-to-cart, begin-checkout,
 * purchase, search, login, …). Keeping every non-page-view event in one table
 * behind an {@link EventType} means new event kinds need no schema change.
 * Retained ~90 days, then rolled up. {@code metadata} holds a small JSON blob
 * for event-specific extras (e.g. search query, quantity).
 */
@Entity
@Table(name = "analytics_event", indexes = {
        @Index(name = "idx_ae_created_at", columnList = "createdAt"),
        @Index(name = "idx_ae_type", columnList = "type"),
        @Index(name = "idx_ae_product_id", columnList = "productId"),
        @Index(name = "idx_ae_session_id", columnList = "sessionId"),
        @Index(name = "idx_ae_visitor_id", columnList = "visitorId")
})
public class AnalyticsEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EventType type;

    @Column(nullable = false, length = 64)
    private String sessionId;

    @Column(nullable = false, length = 64)
    private String visitorId;

    @Column(length = 512)
    private String path;

    private Long productId;

    /** Numeric payload — e.g. order total for PURCHASE, quantity for ADD_TO_CART. */
    private Double value;

    @Lob
    private String metadata;

    @Column(nullable = false)
    private Instant createdAt;

    public Long getId() { return id; }

    public EventType getType() { return type; }
    public void setType(EventType type) { this.type = type; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getVisitorId() { return visitorId; }
    public void setVisitorId(String visitorId) { this.visitorId = visitorId; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
