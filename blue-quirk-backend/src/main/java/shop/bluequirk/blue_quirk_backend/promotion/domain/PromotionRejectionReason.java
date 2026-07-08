package shop.bluequirk.blue_quirk_backend.promotion.domain;

/**
 * Why a coupon was rejected. Each carries a customer-safe default message; the
 * engine returns the reason so callers (checkout, the validate endpoint) can map
 * it to a localized message or surface {@link #getDefaultMessage()} directly.
 */
public enum PromotionRejectionReason {
    NOT_FOUND("This coupon code is not valid."),
    INACTIVE("This coupon is not currently active."),
    NOT_STARTED("This coupon is not active yet."),
    EXPIRED("This coupon has expired."),
    USAGE_LIMIT_REACHED("This coupon has reached its usage limit."),
    CUSTOMER_LIMIT_REACHED("You have already used this coupon the maximum number of times."),
    MINIMUM_NOT_MET("Your order does not meet the minimum amount for this coupon."),
    NOT_ELIGIBLE_CUSTOMER("This coupon is not available for your account."),
    FIRST_ORDER_ONLY("This coupon is valid on your first order only."),
    NO_DISCOUNT("This coupon does not apply any discount to your order.");

    private final String defaultMessage;

    PromotionRejectionReason(String defaultMessage) {
        this.defaultMessage = defaultMessage;
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }
}
