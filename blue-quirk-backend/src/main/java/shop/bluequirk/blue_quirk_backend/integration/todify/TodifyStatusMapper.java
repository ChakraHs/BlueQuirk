package shop.bluequirk.blue_quirk_backend.integration.todify;

import java.util.Set;

import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;

/**
 * Maps Todify fulfillment statuses to the local {@link OrderStatus} lifecycle.
 * Stateless and dependency-free so both the order service and the integration
 * layer can use it without creating a bean cycle.
 *
 * <p>Todify statuses: store_draft_order, pending, in_production, shipped,
 * delivered, cancelled, returned.
 */
public final class TodifyStatusMapper {

    /** Todify statuses past which we stop polling for updates. */
    public static final Set<String> TERMINAL = Set.of("delivered", "cancelled", "returned");

    private TodifyStatusMapper() {}

    /** Best-effort mapping; returns null when the status shouldn't move the local order. */
    public static OrderStatus toOrderStatus(String todifyStatus) {
        if (todifyStatus == null) return null;
        return switch (todifyStatus.trim().toLowerCase()) {
            case "store_draft_order", "pending" -> OrderStatus.CONFIRMED;
            case "in_production"                -> OrderStatus.PROCESSING;
            case "shipped"                      -> OrderStatus.SHIPPED;
            case "delivered"                    -> OrderStatus.DELIVERED;
            case "cancelled", "returned"        -> OrderStatus.CANCELLED;
            default                             -> null;
        };
    }

    public static boolean isTerminal(String todifyStatus) {
        return todifyStatus != null && TERMINAL.contains(todifyStatus.trim().toLowerCase());
    }
}
