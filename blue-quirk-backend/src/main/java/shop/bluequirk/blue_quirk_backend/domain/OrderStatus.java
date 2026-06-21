package shop.bluequirk.blue_quirk_backend.domain;

/** Lifecycle of a cash-on-delivery order. */
public enum OrderStatus {
    PENDING,    // placed, awaiting confirmation call
    CONFIRMED,  // confirmed with the customer
    SHIPPED,
    DELIVERED,
    CANCELLED
}
