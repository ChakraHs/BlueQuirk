package shop.bluequirk.blue_quirk_backend.notification;

import java.security.Security;
import java.util.List;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;

/**
 * Delivers Web Push (VAPID) messages to admins' subscribed browsers — the only
 * mechanism that produces a real OS notification in the background (tab closed)
 * and the only one that reaches iOS/Safari (installed to the Home Screen).
 *
 * <p>Entirely optional and isolated: with no VAPID keys configured the service is
 * simply disabled (SSE in-app notifications keep working), and every send is
 * best-effort — a failure never affects the order, the persisted notification, or
 * the SSE delivery. Expired/gone subscriptions (HTTP 404/410) are pruned.
 */
@Service
public class WebPushService {

    private static final Logger LOG = LoggerFactory.getLogger(WebPushService.class);

    private final WebPushSubscriptionRepository repository;
    private final String publicKey;
    private final boolean enabled;
    private PushService pushService;

    public WebPushService(WebPushSubscriptionRepository repository,
                          @Value("${webpush.public-key:}") String publicKey,
                          @Value("${webpush.private-key:}") String privateKey,
                          @Value("${webpush.subject:mailto:admin@localhost}") String subject) {
        this.repository = repository;
        this.publicKey = publicKey == null ? "" : publicKey.trim();

        boolean ready = false;
        if (!this.publicKey.isBlank() && privateKey != null && !privateKey.isBlank()) {
            try {
                if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                    Security.addProvider(new BouncyCastleProvider());
                }
                this.pushService = new PushService(this.publicKey, privateKey.trim(), subject);
                ready = true;
                LOG.info("Web Push enabled (VAPID configured).");
            } catch (Exception e) {
                LOG.warn("Web Push disabled — invalid VAPID configuration: {}", e.getMessage());
            }
        } else {
            LOG.info("Web Push disabled — no VAPID keys configured (in-app SSE notifications still work).");
        }
        this.enabled = ready;
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** VAPID public key the browser needs as its applicationServerKey (not secret). */
    public String getPublicKey() {
        return publicKey;
    }

    /** Stores (or refreshes) a browser subscription for an admin. Idempotent per endpoint. */
    @Transactional
    public void subscribe(Long userId, String endpoint, String p256dh, String auth) {
        WebPushSubscription sub = repository.findByEndpoint(endpoint)
                .orElseGet(WebPushSubscription::new);
        sub.setRecipientUserId(userId);
        sub.setEndpoint(endpoint);
        sub.setP256dh(p256dh);
        sub.setAuth(auth);
        repository.save(sub);
    }

    /** Removes a browser subscription (admin disabled notifications / signed out). */
    public void unsubscribe(String endpoint) {
        repository.deleteByEndpoint(endpoint);
    }

    /**
     * Best-effort push to every device of one admin. Never throws; prunes dead
     * subscriptions. Called off the checkout thread (after commit) by the
     * notification service.
     */
    public void sendToUser(Long userId, String payloadJson) {
        if (!enabled) return;
        List<WebPushSubscription> subs;
        try {
            subs = repository.findByRecipientUserId(userId);
        } catch (Exception e) {
            LOG.warn("Could not load push subscriptions for admin {}: {}", userId, e.getMessage());
            return;
        }
        for (WebPushSubscription s : subs) {
            try {
                Subscription sub = new Subscription(
                        s.getEndpoint(), new Subscription.Keys(s.getP256dh(), s.getAuth()));
                Notification notification = new Notification(sub, payloadJson);
                int status = pushService.send(notification, Encoding.AES128GCM)
                        .getStatusLine().getStatusCode();
                if (status == HttpStatus.NOT_FOUND.value() || status == HttpStatus.GONE.value()) {
                    // Subscription expired/revoked — drop it so we stop trying.
                    safeDelete(s.getEndpoint());
                } else if (status >= 400) {
                    LOG.warn("Web push rejected (HTTP {}) for admin {}", status, userId);
                }
            } catch (Exception e) {
                LOG.warn("Web push send failed for admin {}: {}", userId, e.getMessage());
            }
        }
    }

    private void safeDelete(String endpoint) {
        try {
            repository.deleteByEndpoint(endpoint);
        } catch (Exception ignored) {
            // pruning is best-effort
        }
    }
}
