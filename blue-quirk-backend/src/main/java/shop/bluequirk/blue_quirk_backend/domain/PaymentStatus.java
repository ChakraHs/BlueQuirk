package shop.bluequirk.blue_quirk_backend.domain;

/**
 * Payment state of an order. For cash-on-delivery the default is UNPAID until
 * the courier collects the cash (marked PAID, usually alongside DELIVERED).
 */
public enum PaymentStatus {
    UNPAID,
    PAID,
    REFUNDED
}
