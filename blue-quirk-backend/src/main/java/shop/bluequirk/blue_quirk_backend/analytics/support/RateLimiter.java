package shop.bluequirk.blue_quirk_backend.analytics.support;

import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Tiny in-memory fixed-window rate limiter keyed by IP hash — protects the public
 * ingest endpoint from spam without any external dependency (Redis/Bucket4j). A
 * caller is allowed up to {@code maxPerWindow} requests per rolling window; over
 * that, requests are silently dropped. The map self-prunes stale windows.
 */
@Component
public class RateLimiter {

    private final int maxPerWindow;
    private final long windowMs;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimiter(
            @Value("${analytics.rate-limit.max-per-window:120}") int maxPerWindow,
            @Value("${analytics.rate-limit.window-seconds:60}") long windowSeconds) {
        this.maxPerWindow = maxPerWindow;
        this.windowMs = windowSeconds * 1000L;
    }

    public boolean allow(String key) {
        long now = System.currentTimeMillis();
        Window w = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.start >= windowMs) {
                return new Window(now);
            }
            existing.count++;
            return existing;
        });
        // Opportunistic pruning so the map doesn't grow unbounded.
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(e -> now - e.getValue().start >= windowMs);
        }
        return w.count <= maxPerWindow;
    }

    private static final class Window {
        final long start;
        int count = 1;
        Window(long start) { this.start = start; }
    }
}
