package shop.bluequirk.blue_quirk_backend.notification;

import java.time.Instant;

import jakarta.persistence.*;

/**
 * A browser Web Push subscription belonging to one admin device. Created when an
 * admin enables desktop/mobile notifications; used by {@link WebPushService} to
 * deliver background OS notifications (the only mechanism that reaches iOS/Safari
 * and that works when the tab is closed).
 *
 * <p>Scoped per admin ({@code recipient_user_id}) so pushes are only ever sent to
 * that admin's own devices. The push {@code endpoint} is unique — the same browser
 * re-subscribing updates rather than duplicates. Stale subscriptions (the push
 * service returns 404/410) are deleted automatically on the next send.
 */
@Entity
@Table(name = "push_subscriptions",
        uniqueConstraints = @UniqueConstraint(name = "uk_push_endpoint", columnNames = "endpoint"),
        indexes = @Index(name = "idx_push_recipient", columnList = "recipient_user_id"))
public class WebPushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_user_id", nullable = false)
    private Long recipientUserId;

    @Column(nullable = false, length = 500)
    private String endpoint;

    /** Client public key (base64url) for payload encryption. */
    @Column(name = "p256dh", nullable = false, length = 255)
    private String p256dh;

    /** Client auth secret (base64url). */
    @Column(nullable = false, length = 255)
    private String auth;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public WebPushSubscription() {}

    public WebPushSubscription(Long recipientUserId, String endpoint, String p256dh, String auth) {
        this.recipientUserId = recipientUserId;
        this.endpoint = endpoint;
        this.p256dh = p256dh;
        this.auth = auth;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getRecipientUserId() { return recipientUserId; }
    public void setRecipientUserId(Long recipientUserId) { this.recipientUserId = recipientUserId; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getP256dh() { return p256dh; }
    public void setP256dh(String p256dh) { this.p256dh = p256dh; }
    public String getAuth() { return auth; }
    public void setAuth(String auth) { this.auth = auth; }
    public Instant getCreatedAt() { return createdAt; }
}
