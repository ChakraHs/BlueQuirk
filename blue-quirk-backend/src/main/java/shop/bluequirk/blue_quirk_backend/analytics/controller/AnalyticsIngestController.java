package shop.bluequirk.blue_quirk_backend.analytics.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import shop.bluequirk.blue_quirk_backend.analytics.dto.EventBatchRequest;
import shop.bluequirk.blue_quirk_backend.analytics.service.AnalyticsIngestService;
import shop.bluequirk.blue_quirk_backend.analytics.service.AnalyticsIngestService.IngestContext;
import shop.bluequirk.blue_quirk_backend.analytics.support.IpHasher;
import shop.bluequirk.blue_quirk_backend.analytics.support.RateLimiter;

/**
 * Public ingest endpoint for the browser tracker. Designed to be as cheap and
 * forgiving as possible: it validates + rate-limits, then hands off to an async
 * worker and returns <b>204 immediately</b> so the tracker's {@code sendBeacon}
 * never waits. It always returns 204 (even when dropping traffic) so bots get no
 * signal and the client never retries on a "rejection".
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsIngestController {

    private final AnalyticsIngestService ingestService;
    private final IpHasher ipHasher;
    private final RateLimiter rateLimiter;
    private final boolean enabled;

    public AnalyticsIngestController(AnalyticsIngestService ingestService,
                                     IpHasher ipHasher,
                                     RateLimiter rateLimiter,
                                     @Value("${analytics.enabled:true}") boolean enabled) {
        this.ingestService = ingestService;
        this.ipHasher = ipHasher;
        this.rateLimiter = rateLimiter;
        this.enabled = enabled;
    }

    @PostMapping("/event")
    public ResponseEntity<Void> collect(@Valid @RequestBody EventBatchRequest batch,
                                        @RequestHeader(value = "User-Agent", required = false) String userAgent,
                                        HttpServletRequest request) {
        if (!enabled) {
            return ResponseEntity.noContent().build();
        }
        String ip = clientIp(request);
        String ipHash = ipHasher.hash(ip);

        // Rate-limit per IP; drop silently (still 204) when over the limit.
        if (!rateLimiter.allow(ipHash)) {
            return ResponseEntity.noContent().build();
        }

        ingestService.ingest(batch, new IngestContext(ip, ipHash, userAgent));
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    /** First hop of X-Forwarded-For (proxy aware), falling back to the socket address. */
    private String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        String real = request.getHeader("X-Real-IP");
        if (real != null && !real.isBlank()) {
            return real.trim();
        }
        return request.getRemoteAddr();
    }
}
