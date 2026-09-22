package shop.bluequirk.blue_quirk_backend.review.entity;

import java.time.Instant;

import jakarta.persistence.*;

/**
 * Durable moderation trail for a {@link Review}: who changed the rating, body,
 * displayed name (and how), status or featured flag, and when. Mirrors
 * {@code OrderAuditLog} — a plain {@code reviewId} (no FK) plus a human-readable
 * before→after {@code detail}, so the record survives the review's deletion and
 * gives full transparency into every edit. The customer's original submission is
 * additionally preserved on the review row itself (the {@code original_*} columns).
 */
@Entity
@Table(name = "review_audit_logs", indexes = {
        @Index(name = "idx_review_audit_review_id", columnList = "review_id"),
        @Index(name = "idx_review_audit_created_at", columnList = "created_at")
})
public class ReviewAuditLog {

    public enum Action {
        /** Admin-entered review created. */
        CREATED,
        /** Rating / body / title / displayed name edited. */
        EDITED,
        /** Displayed name mode changed (original / first name / anonymized / custom). */
        DISPLAY_NAME_CHANGED,
        /** Review approved (made public). */
        APPROVED,
        /** Review rejected. */
        REJECTED,
        /** Featured flag toggled. */
        FEATURED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "review_id", nullable = false)
    private Long reviewId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Action action;

    /** Admin email (or "auto-approve" / "system" for automated actions). */
    @Column(name = "performed_by", length = 320)
    private String performedBy;

    // @Lob alone → LONGTEXT on MariaDB. Human-readable before→after diff.
    @Lob
    private String detail;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public ReviewAuditLog() {}

    public ReviewAuditLog(Long reviewId, Action action, String performedBy, String detail) {
        this.reviewId = reviewId;
        this.action = action;
        this.performedBy = performedBy;
        this.detail = detail;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getReviewId() { return reviewId; }
    public void setReviewId(Long reviewId) { this.reviewId = reviewId; }

    public Action getAction() { return action; }
    public void setAction(Action action) { this.action = action; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
