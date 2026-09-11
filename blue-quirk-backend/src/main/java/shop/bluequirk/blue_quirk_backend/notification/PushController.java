package shop.bluequirk.blue_quirk_backend.notification;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.identity.user.CurrentUserService;

/**
 * Admin-only Web Push subscription management. Locked down by the fail-closed
 * {@code anyRequest().hasAuthority("admin")} rule; every subscription is bound to
 * the calling admin's own user id.
 */
@RestController
@RequestMapping("/api/admin/push")
public class PushController {

    private final WebPushService webPushService;
    private final CurrentUserService currentUserService;

    public PushController(WebPushService webPushService, CurrentUserService currentUserService) {
        this.webPushService = webPushService;
        this.currentUserService = currentUserService;
    }

    /** The VAPID public key (applicationServerKey) + whether push is configured. */
    @GetMapping("/public-key")
    public Map<String, Object> publicKey() {
        return Map.of(
                "enabled", webPushService.isEnabled(),
                "publicKey", webPushService.getPublicKey());
    }

    /** Registers this browser's push subscription for the current admin. */
    @PostMapping("/subscribe")
    public Map<String, Boolean> subscribe(@RequestBody SubscriptionRequest req) {
        if (req == null || req.endpoint() == null || req.endpoint().isBlank()
                || req.keys() == null || req.keys().p256dh() == null || req.keys().auth() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid push subscription");
        }
        webPushService.subscribe(currentUserService.require().getId(),
                req.endpoint().trim(), req.keys().p256dh().trim(), req.keys().auth().trim());
        return Map.of("ok", true);
    }

    /** Removes this browser's push subscription. */
    @PostMapping("/unsubscribe")
    public Map<String, Boolean> unsubscribe(@RequestBody UnsubscribeRequest req) {
        if (req == null || req.endpoint() == null || req.endpoint().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing endpoint");
        }
        // Require an authenticated admin, but the endpoint is the identifier.
        currentUserService.require();
        webPushService.unsubscribe(req.endpoint().trim());
        return Map.of("ok", true);
    }

    public record SubscriptionRequest(String endpoint, Keys keys) {
        public record Keys(String p256dh, String auth) {}
    }

    public record UnsubscribeRequest(String endpoint) {}
}
