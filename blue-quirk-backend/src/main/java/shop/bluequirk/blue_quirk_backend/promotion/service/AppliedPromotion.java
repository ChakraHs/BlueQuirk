package shop.bluequirk.blue_quirk_backend.promotion.service;

import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;

/**
 * A promotion that has been validated and had its usage slot claimed for an
 * in-flight order. Carries the resolved discount so the order can persist its
 * totals; the matching {@code PromotionUsage} row is written once the order id
 * is known.
 */
public record AppliedPromotion(
        Long promotionId,
        String code,
        DiscountType discountType,
        double discountAmount
) {}
