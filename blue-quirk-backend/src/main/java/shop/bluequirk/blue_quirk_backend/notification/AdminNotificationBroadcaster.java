package shop.bluequirk.blue_quirk_backend.notification;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * In-process Server-Sent-Events hub. Holds the live {@link SseEmitter}s of every
 * connected admin dashboard, keyed by the admin's user id, so a "new order" event
 * is pushed only to that specific admin's open tabs — never broadcast to everyone.
 *
 * <p>Realtime delivery is best-effort and never authoritative: the database is the
 * source of truth (the dashboard re-fetches on (re)connect). A dead/slow emitter
 * is simply dropped and the browser's native {@code EventSource} reconnects.
 */
@Component
public class AdminNotificationBroadcaster {

    private static final Logger LOG = LoggerFactory.getLogger(AdminNotificationBroadcaster.class);

    /** Long-lived connection; the client reconnects transparently after a timeout. */
    private static final long TIMEOUT_MS = Duration.ofHours(2).toMillis();

    private final Map<Long, Set<SseEmitter>> emittersByUser = new ConcurrentHashMap<>();

    /** Registers a new stream for an admin and returns the emitter to hand to MVC. */
    public SseEmitter register(Long userId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        emittersByUser.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(emitter);

        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> { emitter.complete(); remove(userId, emitter); });
        emitter.onError(e -> remove(userId, emitter));

        try {
            // An initial event lets the client confirm the stream is live.
            emitter.send(SseEmitter.event().name("ready").data("{}"));
        } catch (IOException e) {
            remove(userId, emitter);
        }
        return emitter;
    }

    /** Pushes a JSON payload to every open tab of a single admin. */
    public void sendToUser(Long userId, String eventName, String jsonPayload) {
        Set<SseEmitter> set = emittersByUser.get(userId);
        if (set == null || set.isEmpty()) return;
        for (SseEmitter emitter : set) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(jsonPayload));
            } catch (Exception e) {
                remove(userId, emitter);
            }
        }
    }

    /**
     * Keep-alive comment sent to every connection, so idle streams are not dropped
     * by proxies and dead sockets are detected and cleaned up promptly.
     */
    @Scheduled(fixedRate = 25_000)
    public void heartbeat() {
        emittersByUser.forEach((userId, set) -> {
            for (SseEmitter emitter : set) {
                try {
                    emitter.send(SseEmitter.event().comment("ping"));
                } catch (Exception e) {
                    remove(userId, emitter);
                }
            }
        });
    }

    private void remove(Long userId, SseEmitter emitter) {
        Set<SseEmitter> set = emittersByUser.get(userId);
        if (set != null) {
            set.remove(emitter);
            if (set.isEmpty()) emittersByUser.remove(userId);
        }
    }
}
