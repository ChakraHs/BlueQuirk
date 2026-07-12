package shop.bluequirk.blue_quirk_backend.domain;

/**
 * The catalog of transactional emails the store sends. Each event's {@code code}
 * doubles as the {@link shop.bluequirk.blue_quirk_backend.entity.EmailTemplate}
 * code: when an active template with that code exists it is used, otherwise the
 * built-in default email is sent (see OrderNotificationService). This is the
 * "assignment mechanism" — assigning a template to an event means giving it the
 * event's code.
 */
public enum EmailEvent {

    ORDER_PLACED_CUSTOMER(
            "Order placed — customer",
            "Sent to the customer right after they place an order."),
    ORDER_PLACED_ADMIN(
            "Order placed — admin",
            "Sent to the store admin when a new order comes in."),
    ORDER_PROCESSING(
            "Order processing",
            "Sent when the order enters preparation."),
    ORDER_PACKED(
            "Order packed",
            "Sent when the order is packed and ready to ship."),
    ORDER_SHIPPED(
            "Order shipped",
            "Sent when the order ships — includes the tracking number when set."),
    ORDER_DELIVERED(
            "Order delivered",
            "Sent when the order is marked as delivered."),
    ORDER_CANCELLED(
            "Order cancelled",
            "Sent when the order is cancelled — includes the reason when set.");

    private final String label;
    private final String description;

    EmailEvent(String label, String description) {
        this.label = label;
        this.description = description;
    }

    /** The template code that maps to this event. */
    public String code() {
        return name();
    }

    public String label() {
        return label;
    }

    public String description() {
        return description;
    }

    /**
     * Maps an order status change to its email event, or null when none applies.
     * CONFIRMED is intentionally silent: the "Order received" email sent at
     * checkout already confirms the order, and Todify reports every freshly
     * pushed order as CONFIRMED, so emailing here produced a duplicate
     * confirmation. The order still advances to CONFIRMED — only the email is
     * suppressed.
     */
    public static EmailEvent forStatus(OrderStatus status) {
        return switch (status) {
            case PROCESSING -> ORDER_PROCESSING;
            case PACKED -> ORDER_PACKED;
            case SHIPPED -> ORDER_SHIPPED;
            case DELIVERED -> ORDER_DELIVERED;
            case CANCELLED -> ORDER_CANCELLED;
            default -> null; // PENDING, CONFIRMED → no customer email
        };
    }
}
