package shop.bluequirk.blue_quirk_backend.analytics.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * A single anonymous visitor identity. The {@code visitorId} is an opaque random
 * UUID minted by the browser (stored in localStorage for ~1 year) — it carries no
 * PII and is never exposed by any read API. This row is what makes
 * unique/returning/new visitor counts possible without authentication.
 */
@Entity
@Table(name = "analytics_visitor", indexes = {
        @Index(name = "idx_av_visitor_id", columnList = "visitorId", unique = true),
        @Index(name = "idx_av_last_seen", columnList = "lastSeen")
})
public class AnalyticsVisitor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64, unique = true)
    private String visitorId;

    @Column(nullable = false)
    private Instant firstSeen;

    @Column(nullable = false)
    private Instant lastSeen;

    /** Number of distinct sessions attributed to this visitor. */
    @Column(nullable = false)
    private long sessionCount = 0;

    @Column(nullable = false)
    private boolean bot = false;

    public Long getId() { return id; }

    public String getVisitorId() { return visitorId; }
    public void setVisitorId(String visitorId) { this.visitorId = visitorId; }

    public Instant getFirstSeen() { return firstSeen; }
    public void setFirstSeen(Instant firstSeen) { this.firstSeen = firstSeen; }

    public Instant getLastSeen() { return lastSeen; }
    public void setLastSeen(Instant lastSeen) { this.lastSeen = lastSeen; }

    public long getSessionCount() { return sessionCount; }
    public void setSessionCount(long sessionCount) { this.sessionCount = sessionCount; }

    public boolean isBot() { return bot; }
    public void setBot(boolean bot) { this.bot = bot; }
}
