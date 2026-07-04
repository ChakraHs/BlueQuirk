package shop.bluequirk.blue_quirk_backend.analytics.dto;

import shop.bluequirk.blue_quirk_backend.analytics.domain.EventType;

/** Per-product event counts (add-to-cart, begin-checkout, purchase, wishlist). */
public record ProductEventRow(Long productId, EventType type, long count) {}
