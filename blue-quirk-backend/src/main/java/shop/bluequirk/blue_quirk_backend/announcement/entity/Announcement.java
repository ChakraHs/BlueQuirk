package shop.bluequirk.blue_quirk_backend.announcement.entity;

import java.time.Instant;
import java.time.LocalDateTime;

import org.hibernate.annotations.ColumnDefault;

import jakarta.persistence.*;

import shop.bluequirk.blue_quirk_backend.announcement.domain.AnnouncementType;

/**
 * One storefront announcement (a row in the rotating top bar). A multi-row entity —
 * a sibling of {@code BundleOffer}/{@code Promotion} — so the admin can run several
 * campaigns at once, ordered by {@link #priority} and gated by an optional schedule.
 *
 * <p>Localized copy is stored per language directly on the row (messageFr/En/Ar,
 * linkTextFr/En/Ar), exactly like {@code StoreSettings}' hero fields — the store's
 * established convention for admin-authored translatable content, so no separate
 * translation table is introduced (spec §15/§24). Messages are plain text (rendered
 * as text by the frontend, never as HTML) so there is no XSS surface.
 */
@Entity
@Table(name = "announcements", indexes = {
        @Index(name = "idx_announcements_active", columnList = "active"),
        @Index(name = "idx_announcements_priority", columnList = "priority")
})
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- Localized message (FR is the base; EN/AR optional, fall back to FR) ---
    @Column(name = "message_fr", nullable = false, length = 300)
    private String messageFr;

    @Column(name = "message_en", length = 300)
    private String messageEn;

    @Column(name = "message_ar", length = 300)
    private String messageAr;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AnnouncementType type = AnnouncementType.INFO;

    /** Display order among active announcements — ascending (1 shows first). */
    @Column(nullable = false)
    @ColumnDefault("0")
    private int priority = 0;

    /** Per-announcement on/off. An inactive row never displays regardless of schedule. */
    @Column(nullable = false)
    @ColumnDefault("true")
    private boolean active = true;

    // --- Optional schedule (null = no bound). Compared against the server clock so
    // activation never depends on the client (spec §10). ---
    @Column(name = "start_at")
    private LocalDateTime startAt;

    @Column(name = "end_at")
    private LocalDateTime endAt;

    // --- Optional call-to-action ---
    /** Relative path ("/fr/...") or absolute http(s) URL. Validated in the service. */
    @Column(length = 512)
    private String link;

    @Column(name = "link_text_fr", length = 80)
    private String linkTextFr;

    @Column(name = "link_text_en", length = 80)
    private String linkTextEn;

    @Column(name = "link_text_ar", length = 80)
    private String linkTextAr;

    /** Whether the CTA opens in a new tab. */
    @Column(name = "open_in_new_tab", nullable = false)
    @ColumnDefault("false")
    private boolean openInNewTab = false;

    // --- Optional presentation (null = use the storefront theme tokens) ---
    /** A short leading glyph/emoji shown before the message (e.g. "🚚"). Optional. */
    @Column(length = 16)
    private String icon;

    /** Background color override (hex, e.g. #111827). Null = theme default. */
    @Column(name = "bg_color", length = 32)
    private String bgColor;

    /** Text color override (hex). Null = theme default. */
    @Column(name = "text_color", length = 32)
    private String textColor;

    /** Per-announcement rotation dwell time in seconds. Null = use the bar default. */
    @Column(name = "display_duration")
    private Integer displayDuration;

    /** Whether the customer may dismiss the bar while this announcement shows. */
    @Column(nullable = false)
    @ColumnDefault("true")
    private boolean dismissible = true;

    // --- Audit ---
    @Column(name = "created_by_email")
    private String createdByEmail;

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

    public Announcement() {}

    // --- Getters & setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMessageFr() { return messageFr; }
    public void setMessageFr(String messageFr) { this.messageFr = messageFr; }

    public String getMessageEn() { return messageEn; }
    public void setMessageEn(String messageEn) { this.messageEn = messageEn; }

    public String getMessageAr() { return messageAr; }
    public void setMessageAr(String messageAr) { this.messageAr = messageAr; }

    public AnnouncementType getType() { return type; }
    public void setType(AnnouncementType type) { this.type = type; }

    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public LocalDateTime getStartAt() { return startAt; }
    public void setStartAt(LocalDateTime startAt) { this.startAt = startAt; }

    public LocalDateTime getEndAt() { return endAt; }
    public void setEndAt(LocalDateTime endAt) { this.endAt = endAt; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }

    public String getLinkTextFr() { return linkTextFr; }
    public void setLinkTextFr(String linkTextFr) { this.linkTextFr = linkTextFr; }

    public String getLinkTextEn() { return linkTextEn; }
    public void setLinkTextEn(String linkTextEn) { this.linkTextEn = linkTextEn; }

    public String getLinkTextAr() { return linkTextAr; }
    public void setLinkTextAr(String linkTextAr) { this.linkTextAr = linkTextAr; }

    public boolean isOpenInNewTab() { return openInNewTab; }
    public void setOpenInNewTab(boolean openInNewTab) { this.openInNewTab = openInNewTab; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getBgColor() { return bgColor; }
    public void setBgColor(String bgColor) { this.bgColor = bgColor; }

    public String getTextColor() { return textColor; }
    public void setTextColor(String textColor) { this.textColor = textColor; }

    public Integer getDisplayDuration() { return displayDuration; }
    public void setDisplayDuration(Integer displayDuration) { this.displayDuration = displayDuration; }

    public boolean isDismissible() { return dismissible; }
    public void setDismissible(boolean dismissible) { this.dismissible = dismissible; }

    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }

    public String getUpdatedByEmail() { return updatedByEmail; }
    public void setUpdatedByEmail(String updatedByEmail) { this.updatedByEmail = updatedByEmail; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
