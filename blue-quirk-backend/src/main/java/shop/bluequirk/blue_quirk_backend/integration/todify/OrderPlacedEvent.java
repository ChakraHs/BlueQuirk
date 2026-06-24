package shop.bluequirk.blue_quirk_backend.integration.todify;

/**
 * Published by {@code OrderService} after an order is committed, so the Todify
 * integration can sync it off the checkout thread (and only after the DB row is
 * durable). Decouples order business logic from Todify — the order service does
 * not depend on the integration layer.
 */
public record OrderPlacedEvent(Long orderId) {}
