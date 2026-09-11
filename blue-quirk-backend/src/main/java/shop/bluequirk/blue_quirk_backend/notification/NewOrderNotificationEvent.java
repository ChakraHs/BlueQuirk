package shop.bluequirk.blue_quirk_backend.notification;

/**
 * Published by {@code OrderService} once a new order is committed, so the admin
 * notification is created + delivered off the checkout thread and ONLY after the
 * order row is durable. Carries the small set of display fields already known at
 * checkout so the listener never has to re-load the order.
 *
 * <p>Decoupled by design: the order service depends only on this record, not on
 * the notification service or the realtime transport.
 */
public record NewOrderNotificationEvent(
        Long orderId,
        String orderNumber,
        String customerName,
        double total,
        int itemCount) {}
