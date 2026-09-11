package shop.bluequirk.blue_quirk_backend.review.entity;

import java.time.Instant;

import org.hibernate.annotations.ColumnDefault;

import jakarta.persistence.*;

import shop.bluequirk.blue_quirk_backend.review.domain.ReviewStatus;

/**
 * One customer product review. A multi-row entity in the {@code review/} domain
 * module (sibling of {@code Announcement}/{@code Promotion}), so it follows the same
 * conventions: {@code productId}/{@code orderId} are plain snapshot ids (no FK) so a
 * product or order can be deleted without orphaning history, and audit timestamps
 * are stamped via {@code @PrePersist}/{@code @PreUpdate}.
 *
 * <p><b>Visibility invariant:</b> a review is public only when
 * {@code status == APPROVED} AND the storefront {@code reviewsEnabled} flag is on.
 * The repository's public queries always filter on {@code APPROVED}; the service
 * short-circuits when the flag is off. Neither path trusts the client. This keeps
 * the store from ever showing pending/rejected/test reviews as social proof.
 */
@Entity
@Table(name = "reviews", indexes = {
        @Index(name = "idx_reviews_product", columnList = "product_id"),
        @Index(name = "idx_reviews_status", columnList = "status"),
        @Index(name = "idx_reviews_featured", columnList = "featured")
})
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Catalog product this review is about (snapshot id — no FK). */
    @Column(name = "product_id", nullable = false)
    private Long productId;

    /** The delivered order that proves the purchase (null for admin-entered reviews). */
    @Column(name = "order_id")
    private Long orderId;

    /** 1–5 stars (validated in the service). */
    @Column(nullable = false)
    private int rating;

    /** Optional short headline. */
    @Column(length = 140)
    private String title;

    @Column(nullable = false, length = 2000)
    private String body;

    /** Display name shown on the card (first name / initial — never the full PII). */
    @Column(name = "author_name", nullable = false, length = 120)
    private String authorName;

    /** Optional size the customer bought (e.g. "M"). */
    @Column(name = "size_purchased", length = 40)
    private String sizePurchased;

    /** Optional variant/colour the customer bought (e.g. "Bleu"). */
    @Column(name = "variant_color", length = 60)
    private String variantColor;

    /**
     * True only when the review was submitted through a valid delivery token whose
     * order actually contained this product. NEVER settable from client input — the
     * service derives it, so "Verified purchase" can never be faked.
     */
    @Column(name = "verified_purchase", nullable = false)
    @ColumnDefault("false")
    private boolean verifiedPurchase = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @ColumnDefault("'PENDING'")
    private ReviewStatus status = ReviewStatus.PENDING;

    /** Admin-highlighted review (shown first / in a featured slot). */
    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean featured = false;

    // Optional customer photo (R2). Stored on the review row itself; only shown once
    // the review is APPROVED. `photoUrl` is the display variant, `photoThumbnailUrl`
    // the small variant for the gallery strip.
    @Column(name = "photo_url", length = 1024)
    private String photoUrl;

    @Column(name = "photo_thumbnail_url", length = 1024)
    private String photoThumbnailUrl;

    /** Language the review was written in ("fr" default). */
    @Column(nullable = false, length = 8)
    @ColumnDefault("'fr'")
    private String lang = "fr";

    // --- Audit ---
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "moderated_by_email", length = 320)
    private String moderatedByEmail;

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

    public Review() {}

    // --- Getters & setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public String getSizePurchased() { return sizePurchased; }
    public void setSizePurchased(String sizePurchased) { this.sizePurchased = sizePurchased; }

    public String getVariantColor() { return variantColor; }
    public void setVariantColor(String variantColor) { this.variantColor = variantColor; }

    public boolean isVerifiedPurchase() { return verifiedPurchase; }
    public void setVerifiedPurchase(boolean verifiedPurchase) { this.verifiedPurchase = verifiedPurchase; }

    public ReviewStatus getStatus() { return status; }
    public void setStatus(ReviewStatus status) { this.status = status; }

    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getPhotoThumbnailUrl() { return photoThumbnailUrl; }
    public void setPhotoThumbnailUrl(String photoThumbnailUrl) { this.photoThumbnailUrl = photoThumbnailUrl; }

    public String getLang() { return lang; }
    public void setLang(String lang) { this.lang = lang; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Instant getApprovedAt() { return approvedAt; }
    public void setApprovedAt(Instant approvedAt) { this.approvedAt = approvedAt; }

    public String getModeratedByEmail() { return moderatedByEmail; }
    public void setModeratedByEmail(String moderatedByEmail) { this.moderatedByEmail = moderatedByEmail; }
}
