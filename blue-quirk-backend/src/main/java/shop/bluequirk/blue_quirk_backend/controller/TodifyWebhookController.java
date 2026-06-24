package shop.bluequirk.blue_quirk_backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.integration.todify.TodifyWebhookService;

/**
 * Receives inbound Todify webhooks. Authentication is the HMAC signature (not a
 * JWT), so this stays outside the bearer-token flow. The raw body bytes are read
 * via {@code @RequestBody byte[]} so the signature is computed over the exact
 * payload Todify signed. We verify, hand off async, and acknowledge fast (within
 * Todify's 15s window); retries are deduped by delivery id.
 */
@RestController
@RequestMapping("/api/todify/webhook")
public class TodifyWebhookController {

    private static final Logger LOG = LoggerFactory.getLogger(TodifyWebhookController.class);

    private final TodifyWebhookService webhookService;

    public TodifyWebhookController(TodifyWebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @PostMapping
    public ResponseEntity<String> receive(
            @RequestBody(required = false) byte[] rawBody,
            @RequestParam(name = "event", required = false) String eventQuery,
            @RequestHeader(name = "X-Todify-Signature", required = false) String signature,
            @RequestHeader(name = "X-Todify-Event", required = false) String eventHeader,
            @RequestHeader(name = "X-Todify-Delivery-Id", required = false) String deliveryId) {

        byte[] body = rawBody == null ? new byte[0] : rawBody;

        if (!webhookService.isSecretConfigured()) {
            LOG.error("Rejected Todify webhook: TODIFY_WEBHOOK_SECRET is not configured.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Webhook secret not configured");
        }
        if (!webhookService.verifySignature(body, signature)) {
            LOG.warn("Rejected Todify webhook: invalid signature (delivery {})", deliveryId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
        }

        String event = eventHeader != null ? eventHeader : eventQuery;
        webhookService.process(event, body, deliveryId);
        return ResponseEntity.ok("ok");
    }
}
