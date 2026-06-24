package shop.bluequirk.blue_quirk_backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;

import shop.bluequirk.blue_quirk_backend.dto.OrderResponse;
import shop.bluequirk.blue_quirk_backend.dto.ProductResponse;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.entity.TodifySyncLog;
import shop.bluequirk.blue_quirk_backend.integration.todify.TodifyApiException;
import shop.bluequirk.blue_quirk_backend.integration.todify.TodifyService;
import shop.bluequirk.blue_quirk_backend.repository.TodifySyncLogRepository;
import shop.bluequirk.blue_quirk_backend.service.OrderService;
import shop.bluequirk.blue_quirk_backend.service.ProductService;

/**
 * Admin-facing endpoints backing the "Admin → Todify" section: templates,
 * orders, webhooks, and sync logs. Pure orchestration over {@link TodifyService};
 * existing product/order controllers are untouched.
 */
@RestController
@RequestMapping("/api/admin/todify")
public class TodifyAdminController {

    private final TodifyService todifyService;
    private final ProductService productService;
    private final OrderService orderService;
    private final TodifySyncLogRepository logRepository;

    public TodifyAdminController(TodifyService todifyService,
                                 ProductService productService,
                                 OrderService orderService,
                                 TodifySyncLogRepository logRepository) {
        this.todifyService = todifyService;
        this.productService = productService;
        this.orderService = orderService;
        this.logRepository = logRepository;
    }

    // --- connection / health ---
    @GetMapping("/store")
    public JsonNode store() { return todifyService.getStore(); }

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of("configured", todifyService.isConfigured());
    }

    // --- templates ---
    @GetMapping("/templates")
    public JsonNode listTemplates(@RequestParam(defaultValue = "1") int page) {
        return todifyService.listTemplates(page);
    }

    @GetMapping("/templates/{id}")
    public JsonNode templateDetail(@PathVariable String id) {
        return todifyService.getTemplateDetail(id);
    }

    @PostMapping("/templates/{id}/import")
    public ProductResponse importTemplate(@PathVariable String id) {
        Product p = todifyService.importTemplate(id);
        return productService.getProductById(p.getId(), null);
    }

    // --- product linking ---
    @PostMapping("/products/{productId}/link")
    public ProductResponse link(@PathVariable Long productId, @RequestBody LinkRequest body) {
        if (body == null || body.templateId() == null || body.templateId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "templateId is required");
        }
        todifyService.linkProduct(productId, body.templateId());
        return productService.getProductById(productId, null);
    }

    @DeleteMapping("/products/{productId}/link")
    public ProductResponse unlink(@PathVariable Long productId) {
        todifyService.unlinkProduct(productId);
        return productService.getProductById(productId, null);
    }

    public record LinkRequest(String templateId) {}

    // --- orders ---
    @GetMapping("/orders")
    public List<OrderResponse> orders() {
        return orderService.getAllOrders();
    }

    @PostMapping("/orders/{id}/sync")
    public ResponseEntity<OrderResponse> syncOrder(@PathVariable Long id) {
        todifyService.syncOrder(id);
        return orderService.getOrderById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/orders/{id}/refresh")
    public ResponseEntity<OrderResponse> refreshOrder(@PathVariable Long id) {
        todifyService.refreshOrderStatus(id);
        return orderService.getOrderById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // --- sync logs ---
    @GetMapping("/logs")
    public Page<TodifySyncLog> logs(@RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "30") int size,
                                    @RequestParam(required = false) String type) {
        PageRequest pr = PageRequest.of(page, size);
        if (type != null && !type.isBlank()) {
            return logRepository.findByTypeOrderByCreatedAtDesc(
                    TodifySyncLog.Type.valueOf(type.toUpperCase()), pr);
        }
        return logRepository.findAllByOrderByCreatedAtDesc(pr);
    }

    // --- webhooks ---
    @GetMapping("/webhooks")
    public JsonNode listWebhooks() { return todifyService.listWebhooks(); }

    @PostMapping("/webhooks")
    public JsonNode registerWebhook(@RequestBody WebhookRequest body) {
        if (body == null || body.url() == null || body.url().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "url is required");
        }
        return todifyService.registerWebhook(body.url(), body.event());
    }

    @DeleteMapping("/webhooks/{id}")
    public JsonNode deleteWebhook(@PathVariable long id) {
        return todifyService.deleteWebhook(id);
    }

    public record WebhookRequest(String url, String event) {}

    // --- error mapping: surface Todify API failures with their status ---
    @ExceptionHandler(TodifyApiException.class)
    public ResponseEntity<Map<String, Object>> handleTodify(TodifyApiException e) {
        HttpStatus status = e.getStatus() == 0 ? HttpStatus.BAD_GATEWAY
                : HttpStatus.resolve(e.getStatus()) != null ? HttpStatus.valueOf(e.getStatus())
                : HttpStatus.BAD_GATEWAY;
        return ResponseEntity.status(status).body(Map.of(
                "error", "todify_api_error",
                "status", e.getStatus(),
                "message", e.getMessage() == null ? "Todify API error" : e.getMessage(),
                "body", e.getBody() == null ? "" : e.getBody()));
    }
}
