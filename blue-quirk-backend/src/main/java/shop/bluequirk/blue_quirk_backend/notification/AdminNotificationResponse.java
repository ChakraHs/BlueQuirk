package shop.bluequirk.blue_quirk_backend.notification;

import java.time.format.DateTimeFormatter;

/** What the API / SSE stream returns for an admin notification. */
public record AdminNotificationResponse(
        Long id,
        String type,
        String title,
        String message,
        Long orderId,
        String orderNumber,
        String customerName,
        double total,
        int itemCount,
        String createdAt,
        String readAt,
        boolean read
) {
    public static AdminNotificationResponse from(AdminNotification n) {
        return new AdminNotificationResponse(
                n.getId(),
                n.getType() != null ? n.getType().name() : null,
                n.getTitle(),
                n.getMessage(),
                n.getOrderId(),
                n.getOrderNumber(),
                n.getCustomerName(),
                n.getTotal(),
                n.getItemCount(),
                n.getCreatedAt() != null ? DateTimeFormatter.ISO_INSTANT.format(n.getCreatedAt()) : null,
                n.getReadAt() != null ? DateTimeFormatter.ISO_INSTANT.format(n.getReadAt()) : null,
                n.isRead()
        );
    }
}
