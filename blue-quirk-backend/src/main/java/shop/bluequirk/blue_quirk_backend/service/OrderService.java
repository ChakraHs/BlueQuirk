package shop.bluequirk.blue_quirk_backend.service;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import com.fasterxml.jackson.databind.ObjectMapper;

import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.domain.PaymentStatus;
import shop.bluequirk.blue_quirk_backend.domain.TodifySyncState;
import shop.bluequirk.blue_quirk_backend.dto.CreateOrderRequest;
import shop.bluequirk.blue_quirk_backend.dto.OrderFinancialsResponse;
import shop.bluequirk.blue_quirk_backend.dto.OrderResponse;
import shop.bluequirk.blue_quirk_backend.entity.Customer;
import shop.bluequirk.blue_quirk_backend.entity.Order;
import shop.bluequirk.blue_quirk_backend.entity.OrderAuditLog;
import shop.bluequirk.blue_quirk_backend.entity.OrderItem;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.finance.service.FinancialCalculationService;
import shop.bluequirk.blue_quirk_backend.identity.user.CurrentUserService;
import shop.bluequirk.blue_quirk_backend.integration.todify.OrderCancelledEvent;
import shop.bluequirk.blue_quirk_backend.integration.todify.OrderPlacedEvent;
import shop.bluequirk.blue_quirk_backend.integration.todify.TodifyStatusMapper;
import shop.bluequirk.blue_quirk_backend.promotion.service.AppliedPromotion;
import shop.bluequirk.blue_quirk_backend.promotion.service.PromotionRedemptionService;
import shop.bluequirk.blue_quirk_backend.promotion.service.PromotionRedemptionService.CustomerRef;
import shop.bluequirk.blue_quirk_backend.repository.OrderAuditLogRepository;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;
import shop.bluequirk.blue_quirk_backend.repository.TodifySyncLogRepository;
import shop.bluequirk.blue_quirk_backend.service.PricingService.LineInput;
import shop.bluequirk.blue_quirk_backend.service.PricingService.PricedCart;
import shop.bluequirk.blue_quirk_backend.service.PricingService.PricedLine;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderNotificationService notificationService;
    private final CustomerService customerService;
    private final ApplicationEventPublisher events;
    private final PricingService pricingService;
    private final PromotionRedemptionService promotionRedemptionService;
    private final FinancialCalculationService finance;
    private final StoreSettingsService storeSettingsService;
    private final CurrentUserService currentUserService;
    private final OrderAuditLogRepository auditRepository;
    private final TodifySyncLogRepository todifyLogRepository;

    private final ObjectMapper mapper = new ObjectMapper();

    public OrderService(OrderRepository orderRepository,
                        OrderNotificationService notificationService,
                        CustomerService customerService,
                        ApplicationEventPublisher events,
                        PricingService pricingService,
                        PromotionRedemptionService promotionRedemptionService,
                        FinancialCalculationService finance,
                        StoreSettingsService storeSettingsService,
                        CurrentUserService currentUserService,
                        OrderAuditLogRepository auditRepository,
                        TodifySyncLogRepository todifyLogRepository) {
        this.orderRepository = orderRepository;
        this.notificationService = notificationService;
        this.customerService = customerService;
        this.events = events;
        this.pricingService = pricingService;
        this.promotionRedemptionService = promotionRedemptionService;
        this.finance = finance;
        this.storeSettingsService = storeSettingsService;
        this.currentUserService = currentUserService;
        this.auditRepository = auditRepository;
        this.todifyLogRepository = todifyLogRepository;
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

        // Reprice the cart from the catalog — the client's prices/totals are never
        // trusted. Only product ids + quantities from the request are used.
        List<LineInput> lineInputs = req.items().stream()
                .map(i -> new LineInput(i.productId(), i.quantity()))
                .toList();
        PricedCart cart = pricingService.price(lineInputs);
        double subtotal = cart.subtotal();
        double shippingFee = cart.shippingFee();

        boolean anyTodifyLinked = false;
        double costTotal = 0;
        for (int i = 0; i < req.items().size(); i++) {
            CreateOrderRequest.Item line = req.items().get(i);
            PricedLine priced = cart.lines().get(i);
            Product product = priced.product();

            OrderItem item = new OrderItem();
            item.setProductId(product.getId());
            // Display fields from what the customer saw; price is authoritative.
            item.setName(notBlank(line.name()) ? line.name() : product.getName());
            item.setImageUrl(line.image());
            item.setVariant(line.variant());
            item.setVariantAttributes(serializeVariant(line.variantAttributes()));
            item.setUnitPrice(priced.unitPrice());
            item.setQuantity(priced.quantity());
            item.setLineTotal(priced.lineTotal());

            // Financial snapshot — freeze the cost at order time so this order's
            // profit is immutable even if the product cost is edited later.
            double unitCost = product.getCost();
            double lineCost = finance.lineCost(unitCost, priced.quantity());
            item.setCostPrice(unitCost);
            item.setLineCost(lineCost);
            item.setLineProfit(finance.lineProfit(priced.lineTotal(), lineCost));
            costTotal += lineCost;

            order.addItem(item);

            if (product.getTodifyTemplateId() != null && !product.getTodifyTemplateId().isBlank()) {
                anyTodifyLinked = true;
            }
        }

        // --- Coupon: validate + reserve a usage slot server-side (atomic). Any
        // rejection throws a 400 and fails the whole order. The discount is always
        // recomputed here from the server subtotal — never taken from the client.
        boolean firstOrder = orderRepository.countByCustomerId(customer.getId()) == 0;
        CustomerRef promoRef = new CustomerRef(
                customer.getId(), user != null ? user.getId() : null, email, firstOrder);

        AppliedPromotion applied = null;
        double discount = 0;
        String couponCode = trimToNull(req.couponCode());
        if (couponCode != null) {
            applied = promotionRedemptionService.apply(couponCode, subtotal, shippingFee, promoRef);
            discount = applied.discountAmount();
        }

        double originalTotal = round(subtotal + shippingFee);
        double finalTotal = Math.max(0, round(subtotal - discount + shippingFee));
        double discountPercentage = subtotal > 0 ? round(discount / subtotal * 100.0) : 0;

        order.setSubtotal(subtotal);
        order.setShippingFee(shippingFee);
        order.setCostTotal(round(costTotal));
        // Snapshot the internal Real Shipping Cost so this order's profit is frozen
        // and immune to later changes of the admin setting. Internal only.
        order.setRealShippingCost(Math.max(0, storeSettingsService.getOrCreate().getRealShippingCost()));
        order.setOriginalTotal(originalTotal);
        order.setDiscountAmount(discount);
        order.setDiscountPercentage(discountPercentage);
        order.setAppliedCouponCode(applied != null ? applied.code() : null);
        order.setPromotionId(applied != null ? applied.promotionId() : null);
        order.setTotal(finalTotal);
        // Mark for Todify sync only when at least one item is linked to a template;
        // pure-local orders never touch Todify.
        order.setTodifySyncState(anyTodifyLinked ? TodifySyncState.PENDING : TodifySyncState.NOT_APPLICABLE);

        // First save to obtain the id, then derive the human-friendly order number.
        Order saved = orderRepository.save(order);
        saved.setOrderNumber(buildOrderNumber(saved));
        saved = orderRepository.save(saved);

        // Record the redemption now that the order id exists (same transaction, so
        // it rolls back with the order if anything downstream fails).
        if (applied != null) {
            promotionRedemptionService.recordUsage(applied, saved.getId(), promoRef, originalTotal);
        }

        OrderResponse response = OrderResponse.from(saved);

        // Best-effort, async — never blocks or fails the order.
        notificationService.sendOrderEmails(response);

        // Hand off to Todify AFTER commit, off-thread — checkout is never slowed or
        // failed by Todify. The local order is already durable at this point.
        if (anyTodifyLinked) {
            events.publishEvent(new OrderPlacedEvent(saved.getId()));
        }

        return response;
    }

    /** Serializes the structured variant map to JSON for the order item; null when empty. */
    private String serializeVariant(Map<String, String> attributes) {
        if (attributes == null || attributes.isEmpty()) return null;
        try {
            return mapper.writeValueAsString(attributes);
        } catch (Exception e) {
            return null;
        }
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

    /**
     * Admin-only financial breakdown for a single order. All figures come from
     * the frozen order/line snapshots; profit and margin are (re)derived via the
     * central {@link FinancialCalculationService} so nothing is ever recomputed
     * from the live catalog. Confidential — callers must be admin.
     */
    @Transactional(readOnly = true)
    public Optional<OrderFinancialsResponse> getOrderFinancials(Long id) {
        return orderRepository.findById(id).map(order -> {
            List<OrderFinancialsResponse.Item> items = order.getItems().stream()
                    .map(i -> new OrderFinancialsResponse.Item(
                            i.getProductId(), i.getName(), i.getSku(),
                            i.getUnitPrice(), i.getCostPrice(), i.getQuantity(),
                            i.getLineTotal(), i.getLineCost(), i.getLineProfit()))
                    .toList();

            double selling = order.getSubtotal();
            double cost = order.getCostTotal();
            double realShipping = order.getRealShippingCost();
            return new OrderFinancialsResponse(
                    order.getId(),
                    order.getOrderNumber(),
                    selling,
                    cost,
                    order.getDiscountAmount(),
                    order.getShippingFee(),
                    order.getTotal(),
                    realShipping,
                    finance.grossProfit(selling, cost),
                    finance.netProfit(order.getTotal(), cost, realShipping),
                    finance.marginPercent(selling, cost),
                    finance.netSales(selling, order.getDiscountAmount()),
                    finance.operationalRevenue(selling, order.getShippingFee()),
                    items
            );
        });
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
     * actually changes, emails the customer a best-effort notification. When
     * cancelling, an optional reason is stored and shown to the customer in the
     * cancellation email.
     */
    @Transactional
    public OrderResponse updateStatus(Long id, OrderStatus status, String reason) {
        require(status != null, "A target status is required");
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        OrderStatus previous = order.getStatus();
        boolean cancelling = status == OrderStatus.CANCELLED && previous != OrderStatus.CANCELLED;
        order.setStatus(status);

        boolean triggerTodifyCancel = false;
        if (status == OrderStatus.CANCELLED) {
            order.setCancellationReason(trimToNull(reason));
        }
        if (cancelling) {
            // Record who/when, log the action, and decide whether Todify must be told.
            String actor = currentActor();
            order.setCancelledAt(LocalDateTime.now());
            order.setCancelledBy(actor);
            triggerTodifyCancel = prepareTodifyCancellation(order);
            audit(order, OrderAuditLog.Action.CANCELLED, actor, trimToNull(reason),
                    "Order cancelled." + (triggerTodifyCancel ? " Todify cancellation requested." : ""));
        }

        Order saved = orderRepository.save(order);
        OrderResponse response = OrderResponse.from(saved);

        if (previous != status) {
            notificationService.sendStatusUpdate(response, status);
        }
        // Send the Todify cancellation off-thread, AFTER this transaction commits.
        if (triggerTodifyCancel) {
            events.publishEvent(new OrderCancelledEvent(saved.getId()));
        }
        return response;
    }

    /**
     * Prepares the Todify sync state when an order is cancelled and returns whether
     * an outbound Todify cancellation must be sent. When the order was already
     * accepted by Todify (has a todifyOrderId) → CANCELLATION_PENDING + true. When
     * it was only queued/failed (never sent) → mark CANCELLED so the submit-retry
     * never re-sends it, and no outbound call is needed.
     */
    private boolean prepareTodifyCancellation(Order order) {
        if (order.getTodifyOrderId() != null && !order.getTodifyOrderId().isBlank()) {
            order.setTodifySyncState(TodifySyncState.CANCELLATION_PENDING);
            return true;
        }
        TodifySyncState state = order.getTodifySyncState();
        if (state == TodifySyncState.PENDING || state == TodifySyncState.FAILED
                || state == TodifySyncState.RETRYING) {
            order.setTodifySyncState(TodifySyncState.CANCELLED);
        }
        return false;
    }

    /**
     * Admin action backing "Retry Todify Cancellation": validates the order is
     * cancelled and exists in Todify, and records the retry in the audit log. The
     * actual (synchronous) Todify call is made by the caller (Todify admin
     * controller) so the order service stays decoupled from the integration layer.
     */
    @Transactional
    public void recordCancellationRetry(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        require(order.getStatus() == OrderStatus.CANCELLED,
                "Only cancelled orders can retry a Todify cancellation.");
        require(order.getTodifyOrderId() != null && !order.getTodifyOrderId().isBlank(),
                "This order was never sent to Todify — there is nothing to cancel.");
        audit(order, OrderAuditLog.Action.TODIFY_CANCEL_RETRIED, currentActor(), null,
                "Manual Todify cancellation retry requested.");
    }

    /** The email of the authenticated admin, or "system" for automated actions. */
    private String currentActor() {
        try {
            return currentUserService.require().getEmail();
        } catch (Exception e) {
            return "system";
        }
    }

    /** Best-effort audit entry — never breaks the business action it records. */
    private void audit(Order order, OrderAuditLog.Action action, String actor, String reason, String detail) {
        try {
            auditRepository.save(new OrderAuditLog(
                    order.getId(), order.getOrderNumber(), action, actor, reason, null, detail));
        } catch (Exception ignored) {
            // audit must never fail the operation
        }
    }

    /** Full lifecycle audit trail for one order (cancel / Todify / delete). */
    @Transactional(readOnly = true)
    public List<OrderAuditLog> getOrderAudit(Long id) {
        return auditRepository.findByOrderIdOrderByCreatedAtDesc(id);
    }

    /** Raw Todify sync logs for one order ("View Synchronization Logs"). */
    @Transactional(readOnly = true)
    public List<shop.bluequirk.blue_quirk_backend.entity.TodifySyncLog> getTodifyLogs(Long id) {
        return todifyLogRepository.findByOrderIdOrderByCreatedAtDesc(id);
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

    /**
     * Applies a Todify fulfillment status (from a webhook or the fallback poll) to
     * the local order: stores the raw Todify status + tracking number, and when it
     * maps to a different local lifecycle status, advances it and fires the same
     * customer status email as a manual admin change. Safe/no-op for unknown orders.
     */
    @Transactional
    public void applyTodifyStatus(Long orderId, String todifyStatus, String trackingNumber) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return;

        if (todifyStatus != null && !todifyStatus.isBlank()) {
            order.setTodifyStatus(todifyStatus.trim());
        }
        if (trackingNumber != null && !trackingNumber.isBlank()) {
            order.setTrackingNumber(trackingNumber.trim());
        }
        order.setTodifyLastSyncAt(LocalDateTime.now());

        OrderStatus mapped = TodifyStatusMapper.toOrderStatus(todifyStatus);
        boolean statusChanged = mapped != null && mapped != order.getStatus();
        if (statusChanged) {
            order.setStatus(mapped);
            // Todify itself cancelled/returned the order → record who/when and mark
            // the Todify cancellation already synchronized (it came from Todify).
            if (mapped == OrderStatus.CANCELLED) {
                order.setCancelledAt(LocalDateTime.now());
                order.setCancelledBy("todify");
                order.setTodifySyncState(TodifySyncState.CANCELLED);
                if (order.getCancellationReason() == null || order.getCancellationReason().isBlank()) {
                    order.setCancellationReason("Cancelled in Todify");
                }
                audit(order, OrderAuditLog.Action.CANCELLED, "todify", order.getCancellationReason(),
                        "Order cancelled by Todify (status \"" + todifyStatus + "\").");
            }
        }

        Order saved = orderRepository.save(order);
        if (statusChanged) {
            notificationService.sendStatusUpdate(OrderResponse.from(saved), mapped);
        }
    }

    /**
     * Permanently deletes a CANCELLED order and all its order-scoped data inside a
     * single transaction (rolls back entirely on any failure). Guards:
     * <ul>
     *   <li>only orders in {@code CANCELLED} status may be deleted;</li>
     *   <li>if the order exists in Todify, its cancellation must already be
     *       synchronized ({@code todifySyncState == CANCELLED}).</li>
     * </ul>
     * Cleanup: order + order items (cascade/orphanRemoval), the shipping/address/
     * payment snapshots (columns on the order row), and the order's Todify sync
     * logs. A durable {@link OrderAuditLog} DELETED entry is written first (it has
     * no FK to the order, so it survives). Promotion-usage rows are intentionally
     * retained (append-only analytics history, decoupled by design) so reporting
     * stays intact — they are not order-owned and never orphaned.
     */
    @Transactional
    public void deleteOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        if (order.getStatus() != OrderStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only cancelled orders can be permanently deleted.");
        }

        boolean inTodify = order.getTodifyOrderId() != null && !order.getTodifyOrderId().isBlank();
        if (inTodify && order.getTodifySyncState() != TodifySyncState.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This order cannot be deleted until the cancellation has been successfully "
                    + "synchronized with Todify.");
        }

        String actor = currentActor();
        // Durable audit BEFORE deletion (separate table, no FK — survives the order).
        auditRepository.save(new OrderAuditLog(order.getId(), order.getOrderNumber(),
                OrderAuditLog.Action.DELETED, actor, order.getCancellationReason(), null,
                "Order permanently deleted (Todify sync: "
                        + (order.getTodifySyncState() == null ? "N/A" : order.getTodifySyncState().name()) + ")."));

        // Order-scoped Todify debug logs are removed with the order.
        todifyLogRepository.deleteByOrderId(order.getId());

        // Removes the order and, via cascade + orphanRemoval, its order_items. The
        // customer/address/payment snapshots live on the order row itself.
        orderRepository.delete(order);
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

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
