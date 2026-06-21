package shop.bluequirk.blue_quirk_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.dto.CreateOrderRequest;
import shop.bluequirk.blue_quirk_backend.dto.OrderResponse;
import shop.bluequirk.blue_quirk_backend.entity.Order;
import shop.bluequirk.blue_quirk_backend.entity.OrderItem;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;
import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final OrderNotificationService notificationService;
    private final double shippingFee;

    public OrderService(OrderRepository orderRepository,
                        ProductRepository productRepository,
                        OrderNotificationService notificationService,
                        @Value("${order.shipping-fee:0}") double shippingFee) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.notificationService = notificationService;
        this.shippingFee = shippingFee;
    }

    /**
     * Creates a cash-on-delivery order for the given user. Prices are read from
     * the catalog (never trusted from the client) and totals computed server-side.
     */
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest req, User user, String email) {
        require(req != null, "Missing order body");
        require(notBlank(req.customerName()), "Full name is required");
        require(notBlank(req.phone()), "Phone number is required");
        require(notBlank(req.city()), "City is required");
        require(notBlank(req.address()), "Address is required");
        require(req.items() != null && !req.items().isEmpty(), "Your cart is empty");

        Order order = new Order();
        order.setUser(user);
        order.setCustomerName(req.customerName().trim());
        order.setPhone(req.phone().trim());
        order.setCity(req.city().trim());
        order.setAddress(req.address().trim());
        order.setNote(req.note() != null ? req.note().trim() : null);
        order.setEmail(email);
        order.setPaymentMethod("COD");
        order.setStatus(OrderStatus.PENDING);
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

        Order saved = orderRepository.save(order);
        OrderResponse response = OrderResponse.from(saved);

        // Best-effort, async — never blocks or fails the order.
        notificationService.sendOrderEmails(response);

        return response;
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAll().stream().map(OrderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Optional<OrderResponse> getOrderById(Long id) {
        return orderRepository.findById(id).map(OrderResponse::from);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByUserId(Long userId) {
        return orderRepository.findByUserId(userId).stream().map(OrderResponse::from).toList();
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
}
