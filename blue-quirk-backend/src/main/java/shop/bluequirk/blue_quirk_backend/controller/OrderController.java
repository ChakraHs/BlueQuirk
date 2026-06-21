package shop.bluequirk.blue_quirk_backend.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.dto.CreateOrderRequest;
import shop.bluequirk.blue_quirk_backend.dto.OrderResponse;
import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;
import shop.bluequirk.blue_quirk_backend.service.OrderService;
import shop.bluequirk.blue_quirk_backend.service.UserProvisioningService;

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

    /** Place a cash-on-delivery order. Requires a signed-in (Keycloak) user. */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderResponse> createOrder(
            @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String keycloakId = jwt.getSubject();
        String email = jwt.getClaimAsString("email");

        // The JIT filter normally creates this row already; provision defensively.
        User user = userRepository.findByKeycloakId(keycloakId).orElse(null);
        if (user == null) {
            userProvisioningService.provisionFromJwt(jwt);
            user = userRepository.findByKeycloakId(keycloakId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not provisioned"));
        }

        OrderResponse order = orderService.createOrder(request, user, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
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

    @DeleteMapping("/{id}")
    public void deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
    }
}
