package shop.bluequirk.blue_quirk_backend.integration.todify;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Thin HTTP wrapper around the Todify Developer API (base {@code todify.base-url}).
 * Pure transport — no business logic — mirroring {@code R2StorageService}'s use of
 * {@link java.net.http.HttpClient} with a Bearer token. Every response is the
 * Todify envelope {@code { success, data, meta }}; this client returns the parsed
 * root {@link JsonNode} and throws {@link TodifyApiException} on non-2xx.
 *
 * <p>When no API token is configured the client reports {@link #isConfigured()}
 * false and callers skip Todify entirely (orders are still saved locally).
 */
@Component
public class TodifyClient {

    private static final Logger LOG = LoggerFactory.getLogger(TodifyClient.class);

    private final boolean enabled;
    private final String baseUrl;
    private final String apiToken;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    public TodifyClient(
            @Value("${todify.enabled:true}") boolean enabled,
            @Value("${todify.base-url:https://todify.ma/api/v1}") String baseUrl,
            @Value("${todify.api-token:}") String apiToken) {
        this.enabled = enabled;
        this.baseUrl = baseUrl.trim().replaceAll("/+$", "");
        this.apiToken = apiToken == null ? "" : apiToken.trim();
    }

    public boolean isConfigured() {
        return enabled && !apiToken.isBlank() && !baseUrl.isBlank();
    }

    // --- Store / health ---
    public JsonNode getStore() {
        return get("/store");
    }

    // --- Templates ---
    public JsonNode listTemplates(int page) {
        return get("/products/templates?page=" + Math.max(1, page));
    }

    public JsonNode getTemplate(String id) {
        return get("/products/templates/" + enc(id));
    }

    // --- Orders ---
    public JsonNode submitOrder(JsonNode body) {
        return send("POST", "/orders", body);
    }

    public JsonNode getOrder(String id) {
        return get("/orders/" + enc(id));
    }

    public JsonNode listOrders(int page) {
        return get("/orders?page=" + Math.max(1, page));
    }

    // --- Webhooks ---
    public JsonNode listWebhooks() {
        return get("/webhooks");
    }

    public JsonNode registerWebhook(JsonNode body) {
        return send("POST", "/webhooks", body);
    }

    public JsonNode deleteWebhook(long id) {
        return send("DELETE", "/webhooks/" + id, null);
    }

    // --- internals ---
    private JsonNode get(String path) {
        return send("GET", path, null);
    }

    // Transient upstream statuses worth retrying for idempotent (GET) reads:
    // Todify's API occasionally returns a brief 503 (or 502/504/429) for heavier
    // endpoints like /products/templates while the service itself is healthy.
    private static final int MAX_GET_ATTEMPTS = 3;

    private static boolean isTransient(int code) {
        return code == 429 || code == 502 || code == 503 || code == 504;
    }

    private JsonNode send(String method, String path, JsonNode body) {
        if (!isConfigured()) {
            throw new TodifyApiException(0, null, "Todify is not configured (set TODIFY_API_TOKEN).");
        }
        // Only GETs are safe to auto-retry (no side effects). POST/DELETE run once.
        int maxAttempts = "GET".equals(method) ? MAX_GET_ATTEMPTS : 1;
        TodifyApiException last = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return doSend(method, path, body);
            } catch (TodifyApiException e) {
                last = e;
                boolean canRetry = attempt < maxAttempts && isTransient(e.getStatus());
                if (!canRetry) {
                    throw e;
                }
                LOG.warn("Todify {} {} returned HTTP {} (attempt {}/{}); retrying…",
                        method, path, e.getStatus(), attempt, maxAttempts);
                sleepBackoff(attempt);
            }
        }
        throw last; // unreachable in practice
    }

    private JsonNode doSend(String method, String path, JsonNode body) {
        URI uri = URI.create(baseUrl + path);
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + apiToken)
                    .header("Accept", "application/json");

            HttpRequest.BodyPublisher publisher;
            if (body != null) {
                publisher = HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body));
                builder.header("Content-Type", "application/json");
            } else {
                publisher = HttpRequest.BodyPublishers.noBody();
            }
            builder.method(method, publisher);

            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            int code = response.statusCode();
            if (code / 100 != 2) {
                throw new TodifyApiException(code, response.body(),
                        "Todify " + method + " " + path + " failed: HTTP " + code);
            }
            String responseBody = response.body();
            return (responseBody == null || responseBody.isBlank())
                    ? mapper.createObjectNode()
                    : mapper.readTree(responseBody);
        } catch (TodifyApiException e) {
            throw e;
        } catch (Exception e) {
            LOG.warn("Todify {} {} transport error: {}", method, path, e.getMessage());
            throw new TodifyApiException("Todify " + method + " " + path + " transport error: " + e.getMessage(), e);
        }
    }

    private void sleepBackoff(int attempt) {
        try {
            Thread.sleep(300L * attempt); // 300ms, 600ms, …
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private String enc(String segment) {
        // Path segments are UUIDs/ids here; encode spaces defensively.
        return segment == null ? "" : segment.trim().replace(" ", "%20");
    }

    /** Exposed so the service can build request bodies with the same mapper. */
    public ObjectMapper mapper() {
        return mapper;
    }
}
