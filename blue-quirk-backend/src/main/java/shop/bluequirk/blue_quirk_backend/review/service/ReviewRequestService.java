package shop.bluequirk.blue_quirk_backend.review.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.entity.Order;
import shop.bluequirk.blue_quirk_backend.entity.StoreSettings;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;
import shop.bluequirk.blue_quirk_backend.review.entity.ReviewRequestToken;
import shop.bluequirk.blue_quirk_backend.review.repository.ReviewRequestTokenRepository;
import shop.bluequirk.blue_quirk_backend.service.EmailService;
import shop.bluequirk.blue_quirk_backend.service.StoreSettingsService;

/**
 * Post-delivery review requests. The flow the spec asks for:
 * <pre>order DELIVERED → wait {reviewRequestDelayDays} → generate a single-use token
 * → email the customer a link → customer submits.</pre>
 *
 * <p>Nothing is ever sent immediately after order creation, and the whole thing is
 * <b>off until an admin turns it on</b> ({@code reviewRequestEmailEnabled}, default
 * false) so no customer email goes out prematurely. Token generation is idempotent
 * per order; a failed email leaves the row unmarked so the next tick retries the send
 * without minting a duplicate token. Sending is best-effort and can never disturb the
 * order lifecycle. The channel is email today (reusing {@link EmailService}), but the
 * token/link is channel-agnostic — WhatsApp/SMS can reuse the exact same token later.
 */
@Service
public class ReviewRequestService {

    private static final Logger LOG = LoggerFactory.getLogger(ReviewRequestService.class);
    private static final String TEMPLATE_CODE = "REVIEW_REQUEST";
    private static final int TOKEN_TTL_DAYS = 60;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OrderRepository orders;
    private final ReviewRequestTokenRepository tokens;
    private final StoreSettingsService settingsService;
    private final EmailService emailService;

    /**
     * Storefront origin used to build the review link in the email. Empty by default
     * → a relative "/{lang}/review/{token}" path is used (still valid behind the
     * reverse proxy). Set {@code review.request.base-url} in prod (e.g. https://redquirk.com).
     */
    private final String baseUrl;

    public ReviewRequestService(OrderRepository orders,
                                ReviewRequestTokenRepository tokens,
                                StoreSettingsService settingsService,
                                EmailService emailService,
                                @Value("${review.request.base-url:}") String baseUrl) {
        this.orders = orders;
        this.tokens = tokens;
        this.settingsService = settingsService;
        this.emailService = emailService;
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim().replaceAll("/+$", "");
    }

    /**
     * Find orders delivered longer than the configured delay ago that have not yet had
     * a review request, and process each. No-op (and cheap) while the feature is off.
     */
    @Transactional
    public int processDueOrders() {
        StoreSettings s = settingsService.getOrCreate();
        if (!s.isReviewRequestEmailEnabled()) {
            return 0; // feature off → never touch customer orders
        }
        int delayDays = Math.max(0, s.getReviewRequestDelayDays());
        LocalDateTime cutoff = LocalDateTime.now().minusDays(delayDays);
        // Bounded batch per tick so a backlog can never overwhelm one run.
        List<Order> due = orders.findDueForReviewRequest(
                shop.bluequirk.blue_quirk_backend.domain.OrderStatus.DELIVERED,
                cutoff, PageRequest.of(0, 200));
        int sent = 0;
        for (Order order : due) {
            try {
                if (processOne(order)) sent++;
            } catch (Exception e) {
                // Best-effort: one bad order never stops the batch or the order flow.
                LOG.warn("Review request failed for order {}: {}", order.getId(), e.getMessage());
            }
        }
        return sent;
    }

    /** Generate (or reuse) the token, email it, and mark the order processed on success. */
    private boolean processOne(Order order) {
        String to = order.getEmail();
        if (to == null || to.isBlank()) {
            // No email on file (COD guest without email). Token still exists for a
            // future channel / manual link; mark processed so we don't loop on it.
            getOrCreateToken(order.getId());
            order.setReviewRequestSentAt(LocalDateTime.now());
            orders.save(order);
            return false;
        }
        sendReviewEmail(order); // throws on failure → order left unmarked, retried next tick
        order.setReviewRequestSentAt(LocalDateTime.now());
        orders.save(order);
        return true;
    }

    /**
     * Admin "Send review request" action for a single order (e.g. orders that shipped
     * before this feature existed, which the auto-scheduler never picks up). Unlike the
     * scheduler this ignores the delay and the {@code reviewRequestEmailEnabled} toggle
     * — it's an explicit admin action. Always returns the (copyable) review link, even
     * when no email is on file, so the admin can share it over WhatsApp instead.
     */
    @Transactional
    public ManualSendResult sendForOrder(Long orderId, boolean sendEmail) {
        Order order = orders.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This order is cancelled — a review request can't be sent.");
        }
        ReviewRequestToken token = getOrCreateToken(orderId);
        String reviewUrl = buildReviewUrl(order, token);

        boolean emailSent = false;
        String email = order.getEmail();
        if (sendEmail) {
            if (email == null || email.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "This order has no email address. Copy the link and send it via WhatsApp/SMS instead.");
            }
            sendReviewEmail(order);
            emailSent = true;
        }
        order.setReviewRequestSentAt(LocalDateTime.now());
        orders.save(order);
        return new ManualSendResult(reviewUrl, emailSent, email);
    }

    /** Build the customer-facing review link for an order's token. */
    private String buildReviewUrl(Order order, ReviewRequestToken token) {
        String lang = order.getLang() == null || order.getLang().isBlank() ? "fr" : order.getLang();
        return (baseUrl.isEmpty() ? "" : baseUrl) + "/" + lang + "/review/" + token.getToken();
    }

    /** Render + send the review-request email in the order's language. Best-effort caller wraps it. */
    private void sendReviewEmail(Order order) {
        ReviewRequestToken token = getOrCreateToken(order.getId());
        String reviewUrl = buildReviewUrl(order, token);
        String lang = order.getLang() == null || order.getLang().isBlank() ? "fr" : order.getLang();
        String storeName = settingsService.getOrCreate().getStoreName();
        emailService.sendTemplate(order.getEmail(), TEMPLATE_CODE, lang, java.util.Map.of(
                "customerName", order.getFirstName() != null ? order.getFirstName()
                        : (order.getCustomerName() != null ? order.getCustomerName() : ""),
                "orderRef", order.getOrderNumber() != null ? order.getOrderNumber() : "",
                "storeName", storeName != null ? storeName : "",
                "reviewUrl", reviewUrl));
    }

    /** Result of a manual send — the link (always) plus whether an email actually went out. */
    public record ManualSendResult(String reviewUrl, boolean emailSent, String email) {}

    /** Idempotent token per order — reused on retry so a failed email never duplicates it. */
    @Transactional
    public ReviewRequestToken getOrCreateToken(Long orderId) {
        return tokens.findFirstByOrderId(orderId).orElseGet(() -> mintToken(orderId));
    }

    private ReviewRequestToken mintToken(Long orderId) {
        byte[] buf = new byte[24];
        RANDOM.nextBytes(buf);
        String secret = Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
        ReviewRequestToken token = new ReviewRequestToken(
                secret, orderId, Instant.now().plus(TOKEN_TTL_DAYS, ChronoUnit.DAYS));
        return tokens.save(token);
    }
}
