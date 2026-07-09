package shop.bluequirk.blue_quirk_backend.integration.todify;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.entity.Order;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.entity.TodifySyncLog;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;
import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;
import shop.bluequirk.blue_quirk_backend.repository.TodifySyncLogRepository;
import shop.bluequirk.blue_quirk_backend.service.OrderService;

/**
 * Verifies and processes inbound Todify webhooks. Signature is HMAC-SHA256 over
 * the raw request body using the per-store webhook secret. Processing is async
 * and idempotent (deduped by {@code X-Todify-Delivery-Id}) so the controller can
 * acknowledge within Todify's 15s window and retries are harmless.
 */
@Service
public class TodifyWebhookService {

    private static final Logger LOG = LoggerFactory.getLogger(TodifyWebhookService.class);

    private final TodifyConfigService config;
    private final TodifyService todifyService;
    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final TodifySyncLogRepository logRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public TodifyWebhookService(TodifyConfigService config,
                                TodifyService todifyService,
                                OrderService orderService,
                                OrderRepository orderRepository,
                                ProductRepository productRepository,
                                TodifySyncLogRepository logRepository) {
        this.config = config;
        this.todifyService = todifyService;
        this.orderService = orderService;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.logRepository = logRepository;
    }

    public boolean isSecretConfigured() {
        return !config.effectiveWebhookSecret().isBlank();
    }

    /**
     * Verifies the {@code X-Todify-Signature} header ("sha256=&lt;hex&gt;") against
     * an HMAC-SHA256 of the raw body. Returns false when no secret is configured
     * (we cannot trust unsigned events).
     */
    public boolean verifySignature(byte[] rawBody, String signatureHeader) {
        String webhookSecret = config.effectiveWebhookSecret();
        if (webhookSecret.isBlank() || signatureHeader == null || signatureHeader.isBlank()) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(rawBody);
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) hex.append(String.format("%02x", b));
            String expected = "sha256=" + hex;
            return MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    signatureHeader.trim().getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            LOG.warn("Webhook signature verification error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Processes a verified webhook off the request thread. Idempotent on
     * deliveryId. Never throws to the caller.
     */
    @Async
    public void process(String event, byte[] rawBody, String deliveryId) {
        String body = new String(rawBody, StandardCharsets.UTF_8);
        try {
            if (deliveryId != null && !deliveryId.isBlank() && logRepository.existsByDeliveryId(deliveryId)) {
                LOG.info("Skipping duplicate Todify webhook delivery {}", deliveryId);
                return;
            }
            JsonNode root = mapper.readTree(body);
            String resolvedEvent = firstNonBlank(event, text(root, "event"));
            JsonNode data = root.path("data");

            switch (resolvedEvent == null ? "" : resolvedEvent) {
                case "template.created" -> handleTemplateCreated(data);
                case "template.updated" -> handleTemplateUpdated(data);
                case "template.deleted" -> handleTemplateDeleted(data);
                case "order.status_changed" -> handleOrderStatusChanged(data);
                case "order.created" -> LOG.info("Todify order.created ack: {}", text(data, "order_id"));
                default -> LOG.info("Unhandled Todify webhook event: {}", resolvedEvent);
            }
            log(resolvedEvent, body, deliveryId, null);
        } catch (Exception e) {
            LOG.warn("Failed to process Todify webhook ({}): {}", event, e.getMessage());
            log(event, body, deliveryId, e.getMessage());
        }
    }

    private void handleTemplateCreated(JsonNode data) {
        String templateId = text(data, "product_id");
        if (templateId == null || templateId.isBlank()) return;
        if (productRepository.existsByTodifyTemplateId(templateId)) return; // idempotent
        todifyService.importTemplate(templateId);
    }

    private void handleTemplateUpdated(JsonNode data) {
        String templateId = text(data, "product_id");
        if (templateId == null) return;
        Product product = productRepository.findByTodifyTemplateId(templateId).orElse(null);
        if (product == null) return;
        // Synced fields only — never touch local images, description, SEO, categories.
        String name = text(data, "name");
        if (name != null && !name.isBlank()) product.setName(name);
        product.setTodifyLastSyncAt(LocalDateTime.now());
        productRepository.save(product);
    }

    private void handleTemplateDeleted(JsonNode data) {
        String templateId = text(data, "product_id");
        if (templateId == null) return;
        Product product = productRepository.findByTodifyTemplateId(templateId).orElse(null);
        if (product == null) return;
        // Soft-deactivate — never hard-delete a product that may have order history.
        product.setStatus(ProductStatus.ARCHIVED);
        product.setTodifyLastSyncAt(LocalDateTime.now());
        productRepository.save(product);
    }

    private void handleOrderStatusChanged(JsonNode data) {
        String todifyOrderId = text(data, "order_id");
        if (todifyOrderId == null) return;
        Order order = orderRepository.findByTodifyOrderId(todifyOrderId).orElse(null);
        if (order == null) return;
        String status = text(data, "status");
        String tracking = text(data, "tracking_number");
        orderService.applyTodifyStatus(order.getId(), status, tracking);
    }

    private void log(String event, String body, String deliveryId, String error) {
        try {
            TodifySyncLog entry = new TodifySyncLog();
            entry.setType(TodifySyncLog.Type.WEBHOOK);
            entry.setEvent(event);
            entry.setDirection("INBOUND");
            entry.setRequestBody(body != null && body.length() > 60000 ? body.substring(0, 60000) : body);
            entry.setErrorMessage(error);
            entry.setDeliveryId(deliveryId);
            logRepository.save(entry);
        } catch (Exception e) {
            LOG.warn("Failed to log Todify webhook: {}", e.getMessage());
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node == null ? null : node.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        return b != null && !b.isBlank() ? b : null;
    }
}
