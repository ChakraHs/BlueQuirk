package shop.bluequirk.blue_quirk_backend.integration.todify;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import shop.bluequirk.blue_quirk_backend.domain.AttributeType;
import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.domain.TodifySyncState;
import shop.bluequirk.blue_quirk_backend.entity.Attribute;
import shop.bluequirk.blue_quirk_backend.entity.AttributeValue;
import shop.bluequirk.blue_quirk_backend.entity.Image;
import shop.bluequirk.blue_quirk_backend.entity.Order;
import shop.bluequirk.blue_quirk_backend.entity.OrderItem;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.entity.TodifySyncLog;
import shop.bluequirk.blue_quirk_backend.repository.AttributeRepository;
import shop.bluequirk.blue_quirk_backend.repository.ImageRepository;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;
import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;
import shop.bluequirk.blue_quirk_backend.repository.TodifySyncLogRepository;
import shop.bluequirk.blue_quirk_backend.service.OrderService;
import shop.bluequirk.blue_quirk_backend.service.ProductImageService;
import shop.bluequirk.blue_quirk_backend.service.R2StorageService;

/**
 * Orchestrates all Todify interactions: pushing local orders for fulfillment,
 * importing/linking templates, and reconciling order status. Business logic
 * lives here; raw HTTP lives in {@link TodifyClient}. The local DB is always the
 * source of truth — a Todify failure never loses or blocks a customer order.
 */
@Service
public class TodifyService {

    private static final Logger LOG = LoggerFactory.getLogger(TodifyService.class);

    private final TodifyClient client;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ImageRepository imageRepository;
    private final AttributeRepository attributeRepository;
    private final R2StorageService r2StorageService;
    private final ProductImageService productImageService;
    private final TodifySyncLogRepository logRepository;
    private final OrderService orderService;

    private final String defaultCountry;
    private final int maxAttempts;

    private final HttpClient imageHttp = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10)).build();

    public TodifyService(TodifyClient client,
                         OrderRepository orderRepository,
                         ProductRepository productRepository,
                         ImageRepository imageRepository,
                         AttributeRepository attributeRepository,
                         R2StorageService r2StorageService,
                         ProductImageService productImageService,
                         TodifySyncLogRepository logRepository,
                         OrderService orderService,
                         @Value("${todify.default-country:MA}") String defaultCountry,
                         @Value("${todify.retry.max-attempts:5}") int maxAttempts) {
        this.client = client;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.imageRepository = imageRepository;
        this.attributeRepository = attributeRepository;
        this.r2StorageService = r2StorageService;
        this.productImageService = productImageService;
        this.logRepository = logRepository;
        this.orderService = orderService;
        this.defaultCountry = defaultCountry;
        this.maxAttempts = maxAttempts;
    }

    public boolean isConfigured() {
        return client.isConfigured();
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    // =====================================================================
    // Order sync (outbound)
    // =====================================================================

    /**
     * Sends a local order to Todify (only the line items linked to a Todify
     * template). Idempotent: an order that already has a {@code todifyOrderId} is
     * never re-sent. Never throws — failures are persisted as FAILED with the
     * error so the retry job can pick them up. Safe to call from the async
     * after-commit listener and from the scheduled retry.
     */
    @Transactional
    public void syncOrder(Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return;

        // Dedupe: already accepted by Todify — make sure state reflects that.
        if (order.getTodifyOrderId() != null && !order.getTodifyOrderId().isBlank()) {
            if (order.getTodifySyncState() != TodifySyncState.SENT) {
                order.setTodifySyncState(TodifySyncState.SENT);
                orderRepository.save(order);
            }
            return;
        }

        // Collect only the items whose product is linked to a Todify template.
        List<OrderItem> linked = new ArrayList<>();
        for (OrderItem item : order.getItems()) {
            if (item.getProductId() == null) continue;
            Product p = productRepository.findById(item.getProductId()).orElse(null);
            if (p != null && p.getTodifyTemplateId() != null && !p.getTodifyTemplateId().isBlank()) {
                linked.add(item);
            }
        }

        if (linked.isEmpty()) {
            order.setTodifySyncState(TodifySyncState.NOT_APPLICABLE);
            orderRepository.save(order);
            return;
        }

        if (!isConfigured()) {
            // Keep the order queued; the retry job will send once configured.
            order.setTodifySyncState(TodifySyncState.PENDING);
            order.setTodifyErrorMessage("Todify not configured — add an API token in Admin → Todify → Settings.");
            orderRepository.save(order);
            return;
        }

        order.setTodifySyncAttempts(order.getTodifySyncAttempts() + 1);
        order.setTodifyLastSyncAt(LocalDateTime.now());

        ObjectNode payload = null;
        try {
            // Build inside the try so a pricing error (e.g. a linked product with
            // no price) is recorded as FAILED with a clear message rather than
            // creating a "collect nothing" Todify order.
            payload = buildOrderPayload(order, linked);
            JsonNode root = client.submitOrder(payload);
            JsonNode data = root.path("data");
            order.setTodifyOrderId(text(data, "id"));
            order.setTodifyReferenceCode(text(data, "reference_code"));
            order.setTodifyStatus(text(data, "status"));
            order.setTodifySyncState(TodifySyncState.SENT);
            order.setTodifyErrorMessage(null);
            orderRepository.save(order);
            log(TodifySyncLog.Type.RESPONSE, "submitOrder", "OUTBOUND", orderId, null,
                    200, payload.toString(), root.toString(), null, null);
            LOG.info("Order {} sent to Todify as {}", orderId, order.getTodifyOrderId());
        } catch (TodifyApiException e) {
            order.setTodifySyncState(TodifySyncState.FAILED);
            order.setTodifyErrorMessage(truncate("HTTP " + e.getStatus() + " " + e.getBody(), 4000));
            orderRepository.save(order);
            log(TodifySyncLog.Type.ERROR, "submitOrder", "OUTBOUND", orderId, null,
                    e.getStatus(), payload != null ? payload.toString() : null, e.getBody(), e.getMessage(), null);
            LOG.warn("Order {} sync to Todify FAILED: {}", orderId, e.getMessage());
        }
    }

    private ObjectNode buildOrderPayload(Order order, List<OrderItem> linkedItems) {
        ObjectNode root = client.mapper().createObjectNode();
        root.put("external_id", String.valueOf(order.getId()));
        root.put("payment_method", "cod");
        if (order.getNote() != null && !order.getNote().isBlank()) {
            root.put("note", truncate(order.getNote(), 500));
        }

        ObjectNode shipping = root.putObject("shipping");
        shipping.put("firstname", firstName(order));
        shipping.put("lastname", lastName(order));
        shipping.put("phone", order.getPhone());
        shipping.put("address", order.getAddress());
        shipping.put("city", order.getCity());
        shipping.putNull("state");
        shipping.put("country", defaultCountry);

        // The shipping the customer must pay on delivery (already 0 when the order
        // earned free shipping, otherwise the flat fee). Todify's order API has no
        // shipping field, so we carry it on the first line's variant as "shipping".
        String shippingLabel = formatMoney(order.getShippingFee());

        ArrayNode items = root.putArray("items");
        boolean shippingAttached = false;
        for (OrderItem item : linkedItems) {
            Product p = productRepository.findById(item.getProductId()).orElse(null);
            if (p == null) continue;

            ObjectNode node = items.addObject();
            node.put("product_id", p.getTodifyTemplateId());

            // Todify's template attribute keys are lowercase ("size","color") and
            // its variant values are the option values verbatim (e.g. the color
            // hex). Imports store the keys capitalized ("Size","Color") and the
            // values unchanged, so we only lowercase the KEYS for Todify to match.
            ObjectNode parsed = parseVariant(item.getVariantAttributes());
            ObjectNode variant = (parsed != null && parsed.size() > 0)
                    ? lowercaseKeys(parsed, client.mapper())
                    : client.mapper().createObjectNode();

            // Attach the shipping cost to the FIRST line item only.
            if (!shippingAttached) {
                variant.put("shipping", shippingLabel);
                shippingAttached = true;
            }
            if (variant.size() > 0) {
                node.set("variant", variant);
            }

            node.put("quantity", Math.min(100, Math.max(1, item.getQuantity())));
            node.put("price", resolveUnitPrice(item, p));
        }
        return root;
    }

    /**
     * The per-unit price (store currency, rounded to 2 decimals) to send to Todify
     * for a line. Todify requires {@code items[].price > 0} — it drives
     * {@code total_amount}, the COD the courier collects. Uses the price
     * snapshotted on the order, falling back to the product's current price for
     * legacy rows. If neither is positive we throw rather than create a
     * "collect nothing" order, so the admin sees a clear, actionable error.
     */
    /**
     * Returns a copy of {@code src} with every field name lower-cased (values
     * untouched) — the inverse of the capitalization applied when a template is
     * imported, so the variant keys match Todify's ("size","color").
     */
    static ObjectNode lowercaseKeys(ObjectNode src, ObjectMapper mapper) {
        ObjectNode out = mapper.createObjectNode();
        src.fields().forEachRemaining(e ->
                out.set(e.getKey().toLowerCase(java.util.Locale.ROOT), e.getValue()));
        return out;
    }

    /** Money as a compact string: "0" for free, "29" for whole amounts, else "29.5". */
    static String formatMoney(double value) {
        double r = Math.round(value * 100.0) / 100.0;
        if (r == Math.floor(r)) return String.valueOf((long) r);
        return String.valueOf(r);
    }

    static double resolveUnitPrice(OrderItem item, Product product) {
        double unitPrice = item.getUnitPrice() > 0 ? item.getUnitPrice() : product.getPrice();
        if (unitPrice <= 0) {
            throw new TodifyApiException(0, null,
                    "Cannot sync order to Todify: \"" + product.getName() + "\" has no price. "
                    + "Todify requires a price greater than 0 — set a selling price on the "
                    + "product and retry the sync.");
        }
        return Math.round(unitPrice * 100.0) / 100.0;
    }

    private ObjectNode parseVariant(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            JsonNode node = client.mapper().readTree(json);
            return node.isObject() ? (ObjectNode) node : null;
        } catch (Exception e) {
            return null;
        }
    }

    // =====================================================================
    // Status reconciliation (inbound poll / webhook helper)
    // =====================================================================

    /** Pulls the latest status from Todify for one order and applies it locally. */
    @Transactional
    public void refreshOrderStatus(Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getTodifyOrderId() == null || !isConfigured()) return;
        try {
            JsonNode root = client.getOrder(order.getTodifyOrderId());
            JsonNode data = root.path("data");
            String status = text(data, "status");
            String tracking = firstNonBlank(text(data, "tracking_number"),
                    text(data.path("shipping"), "tracking_number"));
            applyTodifyStatus(orderId, status, tracking, null);
            log(TodifySyncLog.Type.RESPONSE, "getOrder", "OUTBOUND", orderId, null,
                    200, null, root.toString(), null, null);
        } catch (TodifyApiException e) {
            log(TodifySyncLog.Type.ERROR, "getOrder", "OUTBOUND", orderId, null,
                    e.getStatus(), null, e.getBody(), e.getMessage(), null);
        }
    }

    /**
     * Applies a Todify status (from a webhook or poll) to a local order, saving the
     * raw status + tracking and, when it maps to a different local lifecycle state,
     * delegating to {@link OrderService#applyTodifyStatus} so the customer status
     * email still fires. Returns quietly when the order is unknown.
     */
    public void applyTodifyStatus(Long orderId, String todifyStatus, String trackingNumber, String carrier) {
        orderService.applyTodifyStatus(orderId, todifyStatus, trackingNumber);
    }

    // =====================================================================
    // Templates (import / link)
    // =====================================================================

    public JsonNode getStore() { return client.getStore(); }

    public JsonNode listTemplates(int page) { return client.listTemplates(page); }

    public JsonNode getTemplateDetail(String id) { return client.getTemplate(id); }

    public JsonNode listWebhooks() { return client.listWebhooks(); }

    public JsonNode registerWebhook(String url, String event) {
        ObjectNode body = client.mapper().createObjectNode();
        body.put("url", url);
        if (event != null && !event.isBlank()) body.put("event", event);
        return client.registerWebhook(body);
    }

    public JsonNode deleteWebhook(long id) { return client.deleteWebhook(id); }

    /**
     * Imports a Todify template as a local DRAFT product. Idempotent: re-importing
     * an already-linked template returns the existing product without touching its
     * (admin-customized) images/description. Pricing is left to the admin (0).
     */
    @Transactional
    public Product importTemplate(String templateId) {
        Product existing = productRepository.findByTodifyTemplateId(templateId).orElse(null);
        if (existing != null) return existing;

        JsonNode detail = client.getTemplate(templateId).path("data");

        Product product = new Product();
        product.setName(textOr(detail, "name", "Todify template " + templateId));
        product.setDescription(text(detail, "description"));
        product.setPrice(0); // admin sets selling price before publishing
        product.setStatus(ProductStatus.DRAFT);
        product.setTodifyTemplateId(templateId);
        product.setSyncedFromTodify(true);
        product.setTodifyLastSyncAt(LocalDateTime.now());

        product.setSelectedValues(resolveAttributeValues(detail.path("attributes")));
        product.setImages(importImages(detail));

        Product saved = productRepository.save(product);
        log(TodifySyncLog.Type.RESPONSE, "importTemplate", "OUTBOUND", null, templateId,
                200, null, detail.toString(), null, null);
        return saved;
    }

    @Transactional
    public Product linkProduct(Long productId, String templateId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));
        product.setTodifyTemplateId(templateId == null || templateId.isBlank() ? null : templateId.trim());
        product.setTodifyLastSyncAt(LocalDateTime.now());
        return productRepository.save(product);
    }

    @Transactional
    public Product unlinkProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));
        product.setTodifyTemplateId(null);
        return productRepository.save(product);
    }

    /**
     * Maps a Todify {@code attributes} node ({@code {"size":{"S":"S"},"color":{...}}})
     * to local {@link AttributeValue}s, creating Attributes/values on demand and
     * reusing existing ones by (case-insensitive) name.
     */
    private Set<AttributeValue> resolveAttributeValues(JsonNode attributes) {
        Set<AttributeValue> result = new LinkedHashSet<>();
        if (attributes == null || !attributes.isObject()) return result;

        List<Attribute> all = attributeRepository.findAllWithValues();
        Iterator<Map.Entry<String, JsonNode>> fields = attributes.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            String attrName = entry.getKey();
            Attribute attribute = all.stream()
                    .filter(a -> a.getName() != null && a.getName().equalsIgnoreCase(attrName))
                    .findFirst()
                    .orElse(null);
            if (attribute == null) {
                attribute = new Attribute(capitalize(attrName), guessType(attrName));
                attribute = attributeRepository.save(attribute);
                all.add(attribute);
            }
            for (JsonNode v : valuesOf(entry.getValue())) {
                String valueText = v.asText();
                if (valueText == null || valueText.isBlank()) continue;
                AttributeValue match = findValue(attribute, valueText);
                if (match == null) {
                    attribute.getValues().add(new AttributeValue(valueText, attribute));
                    attribute = attributeRepository.save(attribute); // cascade persists the value
                    match = findValue(attribute, valueText);
                }
                if (match != null) result.add(match);
            }
        }
        return result;
    }

    private AttributeValue findValue(Attribute attr, String value) {
        return attr.getValues().stream()
                .filter(av -> av.getValue() != null && av.getValue().equalsIgnoreCase(value))
                .findFirst()
                .orElse(null);
    }

    private List<JsonNode> valuesOf(JsonNode node) {
        List<JsonNode> out = new ArrayList<>();
        if (node == null) return out;
        if (node.isObject()) {
            node.fields().forEachRemaining(e -> out.add(e.getValue()));
        } else if (node.isArray()) {
            node.forEach(out::add);
        }
        return out;
    }

    private AttributeType guessType(String name) {
        String n = name == null ? "" : name.toLowerCase();
        if (n.contains("color") || n.contains("colour") || n.contains("couleur")) return AttributeType.COLOR;
        if (n.contains("size") || n.contains("taille")) return AttributeType.SIZE;
        return AttributeType.TEXT;
    }

    /**
     * Downloads template images and stores them via the EXISTING Cloudflare R2
     * service (catalog images stay on R2, unchanged). Returns the local Image set
     * with the first image marked primary. On any download/upload error the image
     * is skipped — never blocks the import.
     */
    private Set<Image> importImages(JsonNode detail) {
        Set<Image> images = new LinkedHashSet<>();
        List<String> urls = new ArrayList<>();
        // Prefer the full-resolution images[]. Todify also returns a `thumbnail`
        // (a low-res conversion of the SAME design), so adding both would import
        // every single-image template as two duplicate gallery images. Use the
        // thumbnail only as a fallback when there are no full images. Our own
        // pipeline generates optimized thumbnail/display variants from the original.
        JsonNode imgs = detail.path("images");
        if (imgs.isArray()) {
            for (JsonNode n : imgs) {
                String u = n.isTextual() ? n.asText() : text(n, "url");
                if (u != null && !u.isBlank() && !urls.contains(u)) urls.add(u);
            }
        }
        if (urls.isEmpty()) {
            String thumb = text(detail, "thumbnail");
            if (thumb != null && !thumb.isBlank()) urls.add(thumb);
        }
        if (!r2StorageService.isConfigured()) {
            LOG.warn("R2 not configured — skipping Todify template image import.");
            return images;
        }
        int order = 0;
        for (String url : urls) {
            Image img = downloadToR2(url, order);
            if (img != null) {
                img.setPrimary(order == 0);
                images.add(imageRepository.save(img));
                order++;
            }
        }
        return images;
    }

    private Image downloadToR2(String url, int sortOrder) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(20)).GET().build();
            HttpResponse<byte[]> resp = imageHttp.send(req, HttpResponse.BodyHandlers.ofByteArray());
            if (resp.statusCode() / 100 != 2) return null;
            String contentType = resp.headers().firstValue("Content-Type").orElse("image/jpeg");
            String filename = url.substring(url.lastIndexOf('/') + 1);
            if (filename.isBlank()) filename = "todify-" + sortOrder + ".jpg";
            // Store original + auto-generate thumbnail/display variants, same as
            // an admin upload, so imported images are optimized too.
            Image image = productImageService.buildOptimizedImage(resp.body(), filename, contentType);
            image.setSortOrder(sortOrder);
            return image;
        } catch (Exception e) {
            LOG.warn("Failed to import Todify image {}: {}", url, e.getMessage());
            return null;
        }
    }

    // =====================================================================
    // Logging
    // =====================================================================

    public void log(TodifySyncLog.Type type, String event, String direction, Long orderId, String templateId,
                    Integer httpStatus, String reqBody, String respBody, String error, String deliveryId) {
        try {
            TodifySyncLog entry = new TodifySyncLog();
            entry.setType(type);
            entry.setEvent(event);
            entry.setDirection(direction);
            entry.setOrderId(orderId);
            entry.setTemplateId(templateId);
            entry.setHttpStatus(httpStatus);
            entry.setRequestBody(truncate(reqBody, 60000));
            entry.setResponseBody(truncate(respBody, 60000));
            entry.setErrorMessage(truncate(error, 8000));
            entry.setDeliveryId(deliveryId);
            logRepository.save(entry);
        } catch (Exception e) {
            LOG.warn("Failed to write Todify sync log: {}", e.getMessage());
        }
    }

    // =====================================================================
    // helpers
    // =====================================================================

    private String firstName(Order o) {
        if (o.getFirstName() != null && !o.getFirstName().isBlank()) return o.getFirstName();
        String name = o.getCustomerName() == null ? "" : o.getCustomerName().trim();
        int sp = name.indexOf(' ');
        return sp > 0 ? name.substring(0, sp) : name;
    }

    private String lastName(Order o) {
        if (o.getLastName() != null && !o.getLastName().isBlank()) return o.getLastName();
        String name = o.getCustomerName() == null ? "" : o.getCustomerName().trim();
        int sp = name.indexOf(' ');
        return sp > 0 ? name.substring(sp + 1) : "";
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node == null ? null : node.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    private static String textOr(JsonNode node, String field, String fallback) {
        String v = text(node, field);
        return v == null || v.isBlank() ? fallback : v;
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        return b != null && !b.isBlank() ? b : null;
    }

    private static String capitalize(String s) {
        if (s == null || s.isBlank()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
