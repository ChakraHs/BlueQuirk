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
import jakarta.persistence.Table;
import shop.bluequirk.blue_quirk_backend.analytics.domain.PageType;

/**
 * One raw page view (retained ~90 days, then rolled up into daily stats).
 * Product views are simply page views with {@code pageType = PRODUCT} and a
 * {@code productId}, so there is no separate product-view table to write to.
 * Indexed on every dimension the dashboards aggregate by.
 */
@Entity
@Table(name = "analytics_page_view", indexes = {
        @Index(name = "idx_apv_created_at", columnList = "createdAt"),
        @Index(name = "idx_apv_path", columnList = "path"),
        @Index(name = "idx_apv_product_id", columnList = "productId"),
        @Index(name = "idx_apv_session_id", columnList = "sessionId"),
        @Index(name = "idx_apv_visitor_id", columnList = "visitorId")
})
public class AnalyticsPageView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String sessionId;

    @Column(nullable = false, length = 64)
    private String visitorId;

    @Column(nullable = false, length = 512)
    private String path;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PageType pageType;

    /** Set only for product pages; enables per-product view aggregation. */
    private Long productId;

    @Column(nullable = false)
    private Instant createdAt;

    /** Time spent on the page in ms; back-filled by the next page view / exit. */
    private Long durationMs;

    /** First page view of its session. ("entry"/"exit" are reserved words → is_* columns.) */
    @Column(name = "is_entry", nullable = false)
    private boolean entry = false;

    /** Last page view of its session (set when the session closes). */
    @Column(name = "is_exit", nullable = false)
    private boolean exit = false;

    public Long getId() { return id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getVisitorId() { return visitorId; }
    public void setVisitorId(String visitorId) { this.visitorId = visitorId; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public PageType getPageType() { return pageType; }
    public void setPageType(PageType pageType) { this.pageType = pageType; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Long getDurationMs() { return durationMs; }
    public void setDurationMs(Long durationMs) { this.durationMs = durationMs; }

    public boolean isEntry() { return entry; }
    public void setEntry(boolean entry) { this.entry = entry; }

    public boolean isExit() { return exit; }
    public void setExit(boolean exit) { this.exit = exit; }
}
