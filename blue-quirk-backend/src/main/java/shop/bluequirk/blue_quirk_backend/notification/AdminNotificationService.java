package shop.bluequirk.blue_quirk_backend.notification;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;

/**
 * Creates, queries and delivers admin notifications. Creation fans out one row
 * per admin recipient (each with an independent read state) and then pushes the
 * new notification to that admin's live SSE streams.
 *
 * <p>The whole subsystem is best-effort and fully isolated from checkout: every
 * failure here is caught and logged, and can never affect an order that already
 * committed (this runs after commit, off-thread).
 */
@Service
public class AdminNotificationService {

    private static final Logger LOG = LoggerFactory.getLogger(AdminNotificationService.class);

    /** Cap for the bell's list request (defensive upper bound). */
    private static final int MAX_LIST_LIMIT = 50;

    private final AdminNotificationRepository repository;
    private final AdminNotificationBroadcaster broadcaster;
    private final WebPushService webPushService;
    private final UserRepository userRepository;
    private final ObjectMapper mapper = new ObjectMapper();
    private final String currency;

    public AdminNotificationService(AdminNotificationRepository repository,
                                    AdminNotificationBroadcaster broadcaster,
                                    WebPushService webPushService,
                                    UserRepository userRepository,
                                    @Value("${order.currency:DH}") String currency) {
        this.repository = repository;
        this.broadcaster = broadcaster;
        this.webPushService = webPushService;
        this.userRepository = userRepository;
        this.currency = (currency == null || currency.isBlank()) ? "DH" : currency.trim();
    }

    /**
     * Fans a "new order" notification out to every enabled admin and pushes it to
     * their live streams. Idempotent per (admin, order): a duplicate/retried event
     * never creates a second row. Never throws — checkout has already succeeded.
     */
    public void createForNewOrder(NewOrderNotificationEvent event) {
        List<User> admins;
        try {
            admins = userRepository.findEnabledAdmins();
        } catch (Exception e) {
            LOG.warn("Could not load admin recipients for order {}: {}", event.orderId(), e.getMessage());
            return;
        }

        // Same OS-push payload for every admin (privacy-limited: no customer PII).
        String pushPayload = buildPushPayload(event);

        for (User admin : admins) {
            try {
                if (repository.existsByRecipientUserIdAndOrderIdAndType(
                        admin.getId(), event.orderId(), AdminNotificationType.NEW_ORDER)) {
                    continue; // already notified (idempotent)
                }
                AdminNotification saved = repository.save(build(admin.getId(), event));
                deliver(admin.getId(), saved);
                // Background OS notification (also reaches iOS/closed tabs). Isolated.
                webPushService.sendToUser(admin.getId(), pushPayload);
            } catch (DataIntegrityViolationException dup) {
                // Lost a race on the unique constraint — the other writer created it.
            } catch (Exception e) {
                LOG.warn("Failed to create admin notification for order {} / admin {}: {}",
                        event.orderId(), admin.getId(), e.getMessage());
            }
        }
    }

    private AdminNotification build(Long recipientUserId, NewOrderNotificationEvent event) {
        AdminNotification n = new AdminNotification();
        n.setRecipientUserId(recipientUserId);
        n.setType(AdminNotificationType.NEW_ORDER);
        String ref = event.orderNumber() != null && !event.orderNumber().isBlank()
                ? event.orderNumber() : "#" + event.orderId();
        n.setTitle("New order " + ref);
        n.setMessage(buildMessage(event));
        n.setOrderId(event.orderId());
        n.setOrderNumber(event.orderNumber());
        n.setCustomerName(event.customerName());
        n.setTotal(event.total());
        n.setItemCount(event.itemCount());
        return n;
    }

    private String buildMessage(NewOrderNotificationEvent event) {
        String name = event.customerName() != null && !event.customerName().isBlank()
                ? event.customerName() : "Guest";
        String items = event.itemCount() == 1 ? "1 item" : event.itemCount() + " items";
        return String.format("%s · %.2f %s · %s", name, event.total(), currency, items);
    }

    /**
     * Compact JSON payload for the OS push (consumed by the service worker).
     * Privacy-limited: order reference + total + item count only — no customer
     * name/phone/address (those stay inside the secured dashboard).
     */
    private String buildPushPayload(NewOrderNotificationEvent event) {
        String ref = event.orderNumber() != null && !event.orderNumber().isBlank()
                ? event.orderNumber() : "#" + event.orderId();
        String items = event.itemCount() == 1 ? "1 item" : event.itemCount() + " items";
        try {
            return mapper.writeValueAsString(Map.of(
                    "title", "New order " + ref,
                    "body", String.format("%.2f %s · %s", event.total(), currency, items),
                    "tag", "rq-order-" + event.orderId(),
                    "url", event.orderId() != null ? "/admin-v2/orders/" + event.orderId() : "/admin-v2"));
        } catch (Exception e) {
            return "{\"title\":\"New order " + ref + "\",\"url\":\"/admin-v2\"}";
        }
    }

    /** Serializes and pushes a notification to the recipient's live streams. */
    private void deliver(Long userId, AdminNotification notification) {
        try {
            String json = mapper.writeValueAsString(AdminNotificationResponse.from(notification));
            broadcaster.sendToUser(userId, "notification", json);
        } catch (Exception e) {
            // Realtime delivery is best-effort; the row is already persisted and the
            // dashboard will pick it up on its next fetch/reconnect.
            LOG.warn("Realtime delivery failed for notification {} (user {}): {}",
                    notification.getId(), userId, e.getMessage());
        }
    }

    // --- Read APIs (always scoped to the calling admin) ---------------------

    @Transactional(readOnly = true)
    public List<AdminNotificationResponse> list(Long userId, int limit) {
        int capped = Math.min(Math.max(1, limit), MAX_LIST_LIMIT);
        return repository
                .findByRecipientUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, capped))
                .stream().map(AdminNotificationResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return repository.countByRecipientUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public void markRead(Long userId, Long id) {
        repository.markRead(id, userId, Instant.now());
    }

    @Transactional
    public int markAllRead(Long userId) {
        return repository.markAllRead(userId, Instant.now());
    }
}
