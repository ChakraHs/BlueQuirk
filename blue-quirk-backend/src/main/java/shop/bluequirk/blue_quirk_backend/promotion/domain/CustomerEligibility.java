package shop.bluequirk.blue_quirk_backend.promotion.domain;

/** Which customers may redeem a promotion. */
public enum CustomerEligibility {
    /** Anyone (guest or registered). */
    ALL_CUSTOMERS,
    /** Only customers explicitly listed on the promotion (by id). */
    SELECTED_CUSTOMERS,
    /** Only a customer's very first order. */
    FIRST_ORDER_ONLY
}
