package shop.bluequirk.blue_quirk_backend.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.domain.PaymentStatus;
import shop.bluequirk.blue_quirk_backend.dto.CreateOrderRequest;
import shop.bluequirk.blue_quirk_backend.dto.OrderResponse;
import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;
import shop.bluequirk.blue_quirk_backend.service.OrderService;
import shop.bluequirk.blue_quirk_backend.service.UserProvisioningService;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final UserRepository userRepository;
    private final UserProvisioningService userProvisioningService;

    public OrderController(OrderService orderService,
                           UserRepository userRepository,
                           UserProvisioningService userProvisioningService) {
        this.orderService = orderService;
        this.userRepository = userRepository;
        this.userProvisioningService = userProvisioningService;
    }

    /**
     * Place a cash-on-delivery order. Open to guests — no sign-up required. When
     * the request carries a valid Keycloak token we link the order to that login
     * account; otherwise it's a guest order tied only to its Customer (by email).
     */
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        User user = null;
        if (jwt != null) {
            String keycloakId = jwt.getSubject();
            user = userRepository.findByKeycloakId(keycloakId).orElse(null);
            if (user == null) {
                // The JIT filter usually creates this row already; provision defensively.
                userProvisioningService.provisionFromJwt(jwt);
                user = userRepository.findByKeycloakId(keycloakId).orElse(null);
            }
        }

        OrderResponse order = orderService.createOrder(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    /** Public order tracking by reference (e.g. BQ-2026-000123). */
    @GetMapping("/track/{orderNumber}")
    public ResponseEntity<OrderResponse> trackOrder(@PathVariable String orderNumber) {
        return orderService.getOrderByNumber(orderNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        List<OrderResponse> orders = orderService.getAllOrders();
        int total = orders.size();

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Range", "orders 0-" + Math.max(0, total - 1) + "/" + total);
        headers.add("Access-Control-Expose-Headers", "Content-Range");

        return ResponseEntity.ok().headers(headers).body(orders);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable Long id) {
        return orderService.getOrderById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/user/{userId}")
    public List<OrderResponse> getOrdersByUser(@PathVariable Long userId) {
        return orderService.getOrdersByUserId(userId);
    }

    /** Admin: move an order through its lifecycle (PENDING → CONFIRMED → SHIPPED → DELIVERED / CANCELLED). */
    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody UpdateStatusRequest request) {
        OrderStatus status;
        try {
            status = OrderStatus.valueOf(request.status());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown order status: " + request.status());
        }
        return ResponseEntity.ok(orderService.updateStatus(id, status));
    }

    public record UpdateStatusRequest(String status) {}

    /** Admin: set payment status, carrier tracking number, and/or estimated delivery. */
    @PatchMapping("/{id}/fulfillment")
    public ResponseEntity<OrderResponse> updateFulfillment(
            @PathVariable Long id,
            @RequestBody UpdateFulfillmentRequest request) {
        PaymentStatus paymentStatus = null;
        if (request.paymentStatus() != null && !request.paymentStatus().isBlank()) {
            try {
                paymentStatus = PaymentStatus.valueOf(request.paymentStatus());
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown payment status: " + request.paymentStatus());
            }
        }
        LocalDate estimated = null;
        if (request.estimatedDelivery() != null && !request.estimatedDelivery().isBlank()) {
            try {
                estimated = LocalDate.parse(request.estimatedDelivery());
            } catch (DateTimeParseException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date (expected YYYY-MM-DD): " + request.estimatedDelivery());
            }
        }
        return ResponseEntity.ok(orderService.updateFulfillment(id, paymentStatus, request.trackingNumber(), estimated));
    }

    public record UpdateFulfillmentRequest(String paymentStatus, String trackingNumber, String estimatedDelivery) {}

    @DeleteMapping("/{id}")
    public void deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
    }
}
