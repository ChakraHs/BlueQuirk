package shop.bluequirk.blue_quirk_backend.promotion.engine;

import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.entity.Promotion;

/** Flat currency amount off the subtotal. The engine clamps it to the subtotal. */
@Component
public class FixedAmountDiscountStrategy implements DiscountStrategy {

    @Override
    public DiscountType type() {
        return DiscountType.FIXED_AMOUNT;
    }

    @Override
    public double computeDiscount(Promotion promotion, PromotionContext context) {
        return Math.max(0, promotion.getDiscountValue());
    }
}
