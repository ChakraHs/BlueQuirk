package shop.bluequirk.blue_quirk_backend.notification;

import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.user.CurrentUserService;

/**
 * Admin-only notification center. Every endpoint is locked down by the fail-closed
 * {@code anyRequest().hasAuthority("admin")} rule in {@code SecurityConfig} (this
 * path is not in the public allowlist), and every query is additionally scoped to
 * the calling admin's own user id — an admin can only ever see/mutate their own
 * notifications.
 */
@RestController
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

    private final AdminNotificationService service;
    private final AdminNotificationBroadcaster broadcaster;
    private final CurrentUserService currentUserService;

    public AdminNotificationController(AdminNotificationService service,
                                       AdminNotificationBroadcaster broadcaster,
                                       CurrentUserService currentUserService) {
        this.service = service;
        this.broadcaster = broadcaster;
        this.currentUserService = currentUserService;
    }

    /** Recent notifications for the current admin (newest first). */
    @GetMapping
    public List<AdminNotificationResponse> list(@RequestParam(defaultValue = "20") int limit) {
        return service.list(currentUserService.require().getId(), limit);
    }

    /** Unread count for the bell badge. */
    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", service.unreadCount(currentUserService.require().getId()));
    }

    /** Marks one of the current admin's notifications read (no-op if not theirs). */
    @PostMapping("/{id}/read")
    public void markRead(@PathVariable Long id) {
        service.markRead(currentUserService.require().getId(), id);
    }

    /** Marks all of the current admin's notifications read. */
    @PostMapping("/read-all")
    public Map<String, Integer> markAllRead() {
        return Map.of("updated", service.markAllRead(currentUserService.require().getId()));
    }

    /**
     * Live notification stream (Server-Sent Events). The browser's EventSource
     * cannot send an Authorization header, so the access token is accepted as an
     * {@code ?access_token=} query parameter for THIS path only (see
     * {@code SseBearerTokenResolver}); Spring Security still validates it as a
     * bearer JWT and enforces the admin authority before this method runs.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        User admin = currentUserService.require();
        return broadcaster.register(admin.getId());
    }
}
