package shop.bluequirk.blue_quirk_backend.integration.todify;

/**
 * Published by {@code OrderService} after an order is cancelled and committed, so
 * the Todify integration can send the cancellation request off the request
 * thread (and only once the local CANCELLED state is durable). Mirrors
 * {@link OrderPlacedEvent}: the order service stays decoupled from the
 * integration layer, and a Todify failure never affects the local cancellation.
 */
public record OrderCancelledEvent(Long orderId) {}
