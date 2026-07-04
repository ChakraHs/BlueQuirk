package shop.bluequirk.blue_quirk_backend.analytics.dto;

import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/**
 * The batched payload posted by the browser tracker to {@code POST /api/analytics/event}.
 * The visitor/session ids are opaque client-minted UUIDs; the server is the
 * authority on session lifecycle and never trusts these for anything but grouping.
 */
public record EventBatchRequest(
        @Size(max = 64) String visitorId,
        @Size(max = 64) String sessionId,
        @NotEmpty @Size(max = 50) List<IncomingEvent> events,
        ClientMeta client
) {

    /** One event within a batch. {@code type} is a string so the client stays decoupled from the enum. */
    public record IncomingEvent(
            @Size(max = 40) String type,
            @Size(max = 512) String path,
            Long productId,
            @Size(max = 1024) String referrer,
            Long ts,
            Double value,
            Map<String, Object> meta
    ) {}

    /** Client-supplied environment hints that can't be derived server-side. */
    public record ClientMeta(
            @Size(max = 20) String screen,
            @Size(max = 10) String lang
    ) {}
}
