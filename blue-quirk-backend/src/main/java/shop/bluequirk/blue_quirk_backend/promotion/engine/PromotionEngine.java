package shop.bluequirk.blue_quirk_backend.promotion.engine;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.promotion.domain.CustomerEligibility;
import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.domain.PromotionRejectionReason;
import shop.bluequirk.blue_quirk_backend.promotion.entity.Promotion;

/**
 * The reusable heart of the promotion module. Given a promotion and a
 * server-built {@link PromotionContext}, it runs every eligibility check in a
 * defined order and — if the coupon passes — computes the discount via the
 * matching {@link DiscountStrategy}. It performs no I/O and mutates nothing, so
 * it is shared unchanged by the coupon-preview endpoint and by checkout.
 *
 * <p>Controllers must never compute discounts themselves; they call this engine.
 */
@Component
public class PromotionEngine {

    private final Map<DiscountType, DiscountStrategy> strategies = new EnumMap<>(DiscountType.class);

    public PromotionEngine(List<DiscountStrategy> discountStrategies) {
        for (DiscountStrategy s : discountStrategies) {
            strategies.put(s.type(), s);
        }
    }

    /**
     * Evaluates {@code promotion} against {@code context}. Never throws for a
     * business rejection — returns a {@link PromotionCalculation} whose
     * {@code valid} flag and {@code rejectionReason} describe the outcome.
     */
    public PromotionCalculation evaluate(Promotion promotion, PromotionContext context) {
        if (promotion == null) {
            return PromotionCalculation.rejected(PromotionRejectionReason.NOT_FOUND);
        }

        PromotionRejectionReason eligibility = checkEligibility(promotion, context);
        if (eligibility != null) {
            return PromotionCalculation.rejected(eligibility);
        }

        DiscountStrategy strategy = strategies.get(promotion.getDiscountType());
        if (strategy == null) {
            // A reserved/not-yet-implemented discount type slipped through.
            return PromotionCalculation.rejected(PromotionRejectionReason.NO_DISCOUNT);
        }

        double discount = round(strategy.computeDiscount(promotion, context));
        // A discount can never exceed the goods subtotal, nor be negative.
        discount = Math.max(0, Math.min(discount, round(context.subtotal())));
        if (discount <= 0) {
            return PromotionCalculation.rejected(PromotionRejectionReason.NO_DISCOUNT);
        }
        return PromotionCalculation.ok(promotion, discount);
    }

    /**
     * Runs the non-monetary gates in priority order. Returns the first failing
     * reason, or null if the promotion is redeemable by this context.
     */
    private PromotionRejectionReason checkEligibility(Promotion p, PromotionContext ctx) {
        if (!p.isActive()) {
            return PromotionRejectionReason.INACTIVE;
        }
        LocalDateTime now = ctx.now();
        if (p.getStartDate() != null && now.isBefore(p.getStartDate())) {
            return PromotionRejectionReason.NOT_STARTED;
        }
        if (p.getEndDate() != null && now.isAfter(p.getEndDate())) {
            return PromotionRejectionReason.EXPIRED;
        }
        if (p.getMaxGlobalUsage() != null && p.getUsageCount() >= p.getMaxGlobalUsage()) {
            return PromotionRejectionReason.USAGE_LIMIT_REACHED;
        }
        if (p.getMaxUsagePerCustomer() != null
                && ctx.customerUsageCount() >= p.getMaxUsagePerCustomer()) {
            return PromotionRejectionReason.CUSTOMER_LIMIT_REACHED;
        }

        CustomerEligibility elig = p.getCustomerEligibility();
        if (elig == CustomerEligibility.SELECTED_CUSTOMERS) {
            if (ctx.customerId() == null || !p.getEligibleCustomerIds().contains(ctx.customerId())) {
                return PromotionRejectionReason.NOT_ELIGIBLE_CUSTOMER;
            }
        } else if (elig == CustomerEligibility.FIRST_ORDER_ONLY && !ctx.firstOrder()) {
            return PromotionRejectionReason.FIRST_ORDER_ONLY;
        }

        if (p.getMinOrderAmount() != null && ctx.subtotal() < p.getMinOrderAmount()) {
            return PromotionRejectionReason.MINIMUM_NOT_MET;
        }
        return null;
    }

    /** Currency rounding: half-up to 2 decimals. */
    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
