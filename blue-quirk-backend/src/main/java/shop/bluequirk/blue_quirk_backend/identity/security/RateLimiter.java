package shop.bluequirk.blue_quirk_backend.identity.security;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.stereotype.Component;

/**
 * Lightweight in-memory fixed-window rate limiter for auth endpoints (login,
 * register, forgot-password). Keyed by IP+action.
 *
 * <p><b>Scale note:</b> in-memory state is per-instance. When the backend runs more
 * than one replica, swap this for a Redis-backed limiter (Bucket4j + Redis) — the
 * {@link #tryAcquire} contract stays the same, so callers don't change.
 */
@Component
public class RateLimiter {

    private record Window(long windowStartMs, AtomicInteger count) {}

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    /** @return true if the call is allowed, false if the limit is exceeded. */
    public boolean tryAcquire(String key, int maxPerWindow, Duration window) {
        long now = System.currentTimeMillis();
        long windowMs = window.toMillis();

        Window w = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStartMs() >= windowMs) {
                return new Window(now, new AtomicInteger(0));
            }
            return existing;
        });

        return w.count().incrementAndGet() <= maxPerWindow;
    }
}
