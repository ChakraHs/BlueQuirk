package shop.bluequirk.blue_quirk_backend.promotion.engine;

import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.entity.Promotion;

/** Percentage off the subtotal, capped by {@code maxDiscountAmount} when set. */
@Component
public class PercentageDiscountStrategy implements DiscountStrategy {

    @Override
    public DiscountType type() {
        return DiscountType.PERCENTAGE;
    }

    @Override
    public double computeDiscount(Promotion promotion, PromotionContext context) {
        double pct = Math.max(0, Math.min(100, promotion.getDiscountValue()));
        double raw = context.subtotal() * pct / 100.0;
        Double cap = promotion.getMaxDiscountAmount();
        if (cap != null && cap > 0) {
            raw = Math.min(raw, cap);
        }
        return raw;
    }
}
