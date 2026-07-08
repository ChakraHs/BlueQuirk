package shop.bluequirk.blue_quirk_backend.promotion.engine;

import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.entity.Promotion;

/**
 * Computes the raw discount for one {@link DiscountType}. Implementations are
 * Spring beans discovered by the {@link PromotionEngine}; adding a new discount
 * type is a matter of adding one strategy bean — no engine or schema change. The
 * engine handles validation, rounding and clamping, so a strategy only needs the
 * arithmetic for its type.
 */
public interface DiscountStrategy {

    DiscountType type();

    /** Raw discount (pre-rounding, pre-clamp) for this promotion and context. */
    double computeDiscount(Promotion promotion, PromotionContext context);
}
