package shop.bluequirk.blue_quirk_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.domain.PaymentStatus;
import shop.bluequirk.blue_quirk_backend.dto.CreateOrderRequest;
import shop.bluequirk.blue_quirk_backend.dto.OrderResponse;
import shop.bluequirk.blue_quirk_backend.entity.Customer;
import shop.bluequirk.blue_quirk_backend.entity.Order;
import shop.bluequirk.blue_quirk_backend.entity.OrderItem;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;
import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final OrderNotificationService notificationService;
    private final CustomerService customerService;
    private final double shippingFee;

    public OrderService(OrderRepository orderRepository,
                        ProductRepository productRepository,
                        OrderNotificationService notificationService,
                        CustomerService customerService,
                        @Value("${order.shipping-fee:0}") double shippingFee) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.notificationService = notificationService;
        this.customerService = customerService;
        this.shippingFee = shippingFee;
    }

    /**
     * Creates a cash-on-delivery order. Works for guests (no account) and
     * registered users alike — {@code user} may be null. Always creates or reuses
     * a Customer keyed by email and links the order to it. Prices are read from
     * the catalog (never trusted from the client) and totals computed server-side.
     */
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest req, User user) {
        require(req != null, "Missing order body");

        // Resolve the customer's name from the split fields, falling back to the
        // legacy single-name field, then to the linked account.
        String firstName = trimToNull(req.firstName());
        String lastName = trimToNull(req.lastName());
        String fullName = notBlank(req.customerName())
                ? req.customerName().trim()
                : joinName(firstName, lastName);

        String email = notBlank(req.email()) ? req.email().trim()
                : (user != null ? user.getEmail() : null);

        require(notBlank(fullName), "Your name is required");
        require(notBlank(email), "Email is required");
        require(notBlank(req.phone()), "Phone number is required");
        require(notBlank(req.city()), "City is required");
        require(notBlank(req.address()), "Address is required");
        require(req.items() != null && !req.items().isEmpty(), "Your cart is empty");

        // Create or reuse the Customer (independent of any login account).
        Customer customer = customerService.findOrCreateByEmail(
                email, firstName, lastName, req.phone(),
                req.address(), req.city(), req.postalCode(), user);

        Order order = new Order();
        order.setUser(user);
        order.setCustomer(customer);
        order.setCustomerName(fullName);
        order.setFirstName(firstName);
        order.setLastName(lastName);
        order.setPhone(req.phone().trim());
        order.setCity(req.city().trim());
        order.setAddress(req.address().trim());
        order.setPostalCode(trimToNull(req.postalCode()));
        order.setNote(req.note() != null ? req.note().trim() : null);
        order.setEmail(email);
        order.setPaymentMethod("COD");
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentStatus(PaymentStatus.UNPAID);
        order.setOrderDate(LocalDateTime.now());

        double subtotal = 0;
        for (CreateOrderRequest.Item line : req.items()) {
            require(line.productId() != null, "Order line is missing a product");
            int qty = Math.max(1, line.quantity());
            Product product = productRepository.findById(line.productId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Product " + line.productId() + " no longer exists"));

            double unitPrice = product.getPrice();
            double lineTotal = unitPrice * qty;
            subtotal += lineTotal;

            OrderItem item = new OrderItem();
            item.setProductId(product.getId());
            // Display fields from what the customer saw; price is authoritative.
            item.setName(notBlank(line.name()) ? line.name() : product.getName());
            item.setImageUrl(line.image());
            item.setVariant(line.variant());
            item.setUnitPrice(unitPrice);
            item.setQuantity(qty);
            item.setLineTotal(lineTotal);
            order.addItem(item);
        }

        order.setSubtotal(subtotal);
        order.setShippingFee(shippingFee);
        order.setTotal(subtotal + shippingFee);

        // First save to obtain the id, then derive the human-friendly order number.
        Order saved = orderRepository.save(order);
        saved.setOrderNumber(buildOrderNumber(saved));
        saved = orderRepository.save(saved);

        OrderResponse response = OrderResponse.from(saved);

        // Best-effort, async — never blocks or fails the order.
        notificationService.sendOrderEmails(response);

        return response;
    }

    /** "BQ-2026-000123" — year of the order plus its zero-padded id. */
    private String buildOrderNumber(Order order) {
        int year = (order.getOrderDate() != null ? order.getOrderDate() : LocalDateTime.now()).getYear();
        return String.format("BQ-%d-%06d", year, order.getId());
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAll().stream().map(OrderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Optional<OrderResponse> getOrderById(Long id) {
        return orderRepository.findById(id).map(OrderResponse::from);
    }

    /** Public order tracking — look up by the BQ-YYYY-NNNNNN reference. */
    @Transactional(readOnly = true)
    public Optional<OrderResponse> getOrderByNumber(String orderNumber) {
        if (orderNumber == null || orderNumber.isBlank()) return Optional.empty();
        return orderRepository.findByOrderNumberIgnoreCase(orderNumber.trim()).map(OrderResponse::from);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByUserId(Long userId) {
        return orderRepository.findByUserId(userId).stream().map(OrderResponse::from).toList();
    }

    /**
     * Updates an order's lifecycle status (admin action) and, when the status
     * actually changes, emails the customer a best-effort notification.
     */
    @Transactional
    public OrderResponse updateStatus(Long id, OrderStatus status) {
        require(status != null, "A target status is required");
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        OrderStatus previous = order.getStatus();
        order.setStatus(status);
        Order saved = orderRepository.save(order);
        OrderResponse response = OrderResponse.from(saved);

        if (previous != status) {
            notificationService.sendStatusUpdate(response, status);
        }
        return response;
    }

    /**
     * Admin: update fulfillment fields (payment status, carrier tracking number,
     * estimated delivery date). Any null argument leaves that field unchanged.
     */
    @Transactional
    public OrderResponse updateFulfillment(Long id, PaymentStatus paymentStatus,
                                           String trackingNumber, LocalDate estimatedDelivery) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (paymentStatus != null) order.setPaymentStatus(paymentStatus);
        if (trackingNumber != null) order.setTrackingNumber(trimToNull(trackingNumber));
        if (estimatedDelivery != null) order.setEstimatedDelivery(estimatedDelivery);
        return OrderResponse.from(orderRepository.save(order));
    }

    public void deleteOrder(Long id) {
        orderRepository.deleteById(id);
    }

    private void require(boolean condition, String message) {
        if (!condition) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private String trimToNull(String s) {
        return notBlank(s) ? s.trim() : null;
    }

    private String joinName(String first, String last) {
        String joined = ((first != null ? first : "") + " " + (last != null ? last : "")).trim();
        return joined.isEmpty() ? null : joined;
    }
}
