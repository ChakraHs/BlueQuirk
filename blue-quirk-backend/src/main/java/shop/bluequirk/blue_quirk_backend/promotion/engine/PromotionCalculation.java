package shop.bluequirk.blue_quirk_backend.promotion.engine;

import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.domain.PromotionRejectionReason;
import shop.bluequirk.blue_quirk_backend.promotion.entity.Promotion;

/**
 * Outcome of evaluating a coupon: either a valid discount, or a rejection with a
 * machine-readable reason and a customer-safe message. Carries no JPA entity so
 * it is safe to hand straight to a controller/DTO.
 */
public record PromotionCalculation(
        boolean valid,
        PromotionRejectionReason rejectionReason,
        String message,
        Long promotionId,
        String code,
        DiscountType discountType,
        double discountAmount
) {
    public static PromotionCalculation rejected(PromotionRejectionReason reason) {
        return new PromotionCalculation(false, reason, reason.getDefaultMessage(),
                null, null, null, 0);
    }

    public static PromotionCalculation ok(Promotion promotion, double discountAmount) {
        return new PromotionCalculation(true, null, null,
                promotion.getId(), promotion.getCode(), promotion.getDiscountType(), discountAmount);
    }
}
