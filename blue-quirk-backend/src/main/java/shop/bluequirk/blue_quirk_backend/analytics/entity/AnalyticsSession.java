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
import shop.bluequirk.blue_quirk_backend.analytics.domain.DeviceType;
import shop.bluequirk.blue_quirk_backend.analytics.domain.ReferrerSource;

/**
 * A visit — a run of activity by one visitor, closed after 30 minutes of
 * inactivity (the "session"). Carries the derived device/referrer/geo context
 * (resolved once, on the first event of the session) and the aggregate figures
 * used for bounce rate and average session duration.
 */
@Entity
@Table(name = "analytics_session", indexes = {
        @Index(name = "idx_as_session_id", columnList = "sessionId", unique = true),
        @Index(name = "idx_as_visitor_id", columnList = "visitorId"),
        @Index(name = "idx_as_started_at", columnList = "startedAt"),
        @Index(name = "idx_as_last_activity", columnList = "lastActivityAt")
})
public class AnalyticsSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64, unique = true)
    private String sessionId;

    @Column(nullable = false, length = 64)
    private String visitorId;

    @Column(nullable = false)
    private Instant startedAt;

    @Column(nullable = false)
    private Instant lastActivityAt;

    /** Set when the session is closed by the reaper; null while active. */
    private Instant endedAt;

    @Column(nullable = false)
    private long durationSeconds = 0;

    @Column(nullable = false)
    private int pageViewCount = 0;

    /** True when the session had a single page view (used for bounce rate). */
    @Column(nullable = false)
    private boolean bounce = true;

    /** True the first time this visitorId is ever seen (new vs returning). */
    @Column(nullable = false)
    private boolean newVisitor = false;

    @Column(length = 512)
    private String entryPath;

    @Column(length = 512)
    private String exitPath;

    @Column(length = 512)
    private String referrer;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ReferrerSource referrerSource;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private DeviceType deviceType;

    @Column(length = 60)
    private String browser;

    @Column(length = 60)
    private String os;

    @Column(length = 20)
    private String screen;

    @Column(length = 80)
    private String country;

    @Column(length = 120)
    private String city;

    /** Salted SHA-256 of the client IP — never the raw IP. */
    @Column(length = 64)
    private String ipHash;

    public Long getId() { return id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getVisitorId() { return visitorId; }
    public void setVisitorId(String visitorId) { this.visitorId = visitorId; }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getLastActivityAt() { return lastActivityAt; }
    public void setLastActivityAt(Instant lastActivityAt) { this.lastActivityAt = lastActivityAt; }

    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }

    public long getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(long durationSeconds) { this.durationSeconds = durationSeconds; }

    public int getPageViewCount() { return pageViewCount; }
    public void setPageViewCount(int pageViewCount) { this.pageViewCount = pageViewCount; }

    public boolean isBounce() { return bounce; }
    public void setBounce(boolean bounce) { this.bounce = bounce; }

    public boolean isNewVisitor() { return newVisitor; }
    public void setNewVisitor(boolean newVisitor) { this.newVisitor = newVisitor; }

    public String getEntryPath() { return entryPath; }
    public void setEntryPath(String entryPath) { this.entryPath = entryPath; }

    public String getExitPath() { return exitPath; }
    public void setExitPath(String exitPath) { this.exitPath = exitPath; }

    public String getReferrer() { return referrer; }
    public void setReferrer(String referrer) { this.referrer = referrer; }

    public ReferrerSource getReferrerSource() { return referrerSource; }
    public void setReferrerSource(ReferrerSource referrerSource) { this.referrerSource = referrerSource; }

    public DeviceType getDeviceType() { return deviceType; }
    public void setDeviceType(DeviceType deviceType) { this.deviceType = deviceType; }

    public String getBrowser() { return browser; }
    public void setBrowser(String browser) { this.browser = browser; }

    public String getOs() { return os; }
    public void setOs(String os) { this.os = os; }

    public String getScreen() { return screen; }
    public void setScreen(String screen) { this.screen = screen; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getIpHash() { return ipHash; }
    public void setIpHash(String ipHash) { this.ipHash = ipHash; }
}
