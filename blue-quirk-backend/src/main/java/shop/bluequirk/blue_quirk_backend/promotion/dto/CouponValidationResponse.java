package shop.bluequirk.blue_quirk_backend.promotion.dto;

import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PromotionCalculation;

/**
 * Coupon-preview result. Carries the server-computed money breakdown so the
 * storefront can render it verbatim — the frontend never computes the payable
 * amount itself. On rejection {@code valid} is false and {@code message}
 * explains why (discount is 0 and total equals subtotal + shipping).
 */
public record CouponValidationResponse(
        boolean valid,
        String code,
        String message,
        DiscountType discountType,
        double subtotal,
        double shippingFee,
        double discountAmount,
        double total,
        Long promotionId
) {
    public static CouponValidationResponse from(PromotionCalculation calc,
                                                double subtotal, double shippingFee) {
        double discount = calc.valid() ? calc.discountAmount() : 0;
        double total = round(subtotal - discount + shippingFee);
        return new CouponValidationResponse(
                calc.valid(),
                calc.code(),
                calc.valid() ? null : calc.message(),
                calc.discountType(),
                round(subtotal),
                round(shippingFee),
                round(discount),
                Math.max(0, total),
                calc.promotionId());
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
