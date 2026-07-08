package shop.bluequirk.blue_quirk_backend.promotion;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import shop.bluequirk.blue_quirk_backend.promotion.domain.CustomerEligibility;
import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.domain.PromotionRejectionReason;
import shop.bluequirk.blue_quirk_backend.promotion.engine.FixedAmountDiscountStrategy;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PercentageDiscountStrategy;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PromotionCalculation;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PromotionContext;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PromotionEngine;
import shop.bluequirk.blue_quirk_backend.promotion.entity.Promotion;

/** Unit tests for the pure validation + discount-calculation engine. */
class PromotionEngineTest {

    private final PromotionEngine engine = new PromotionEngine(
            List.of(new PercentageDiscountStrategy(), new FixedAmountDiscountStrategy()));

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 8, 12, 0);

    // --- fixtures ---

    private Promotion percentage(double pct) {
        Promotion p = new Promotion();
        p.setName("Test");
        p.setCode("SAVE");
        p.setActive(true);
        p.setDiscountType(DiscountType.PERCENTAGE);
        p.setDiscountValue(pct);
        return p;
    }

    private Promotion fixed(double amount) {
        Promotion p = percentage(0);
        p.setDiscountType(DiscountType.FIXED_AMOUNT);
        p.setDiscountValue(amount);
        return p;
    }

    private PromotionContext ctx(double subtotal) {
        return new PromotionContext(subtotal, 30, "a@b.com", 1L, true, 0, NOW);
    }

    // --- valid coupons + discount math ---

    @Test
    void validPercentageDiscountIsCalculated() {
        PromotionCalculation calc = engine.evaluate(percentage(20), ctx(200));
        assertThat(calc.valid()).isTrue();
        assertThat(calc.discountAmount()).isEqualTo(40.0);
        assertThat(calc.discountType()).isEqualTo(DiscountType.PERCENTAGE);
    }

    @Test
    void validFixedDiscountIsCalculated() {
        PromotionCalculation calc = engine.evaluate(fixed(50), ctx(200));
        assertThat(calc.valid()).isTrue();
        assertThat(calc.discountAmount()).isEqualTo(50.0);
    }

    @Test
    void percentageDiscountIsCappedByMaxDiscountAmount() {
        Promotion p = percentage(50);
        p.setMaxDiscountAmount(30.0);
        PromotionCalculation calc = engine.evaluate(p, ctx(200)); // 50% of 200 = 100, capped to 30
        assertThat(calc.discountAmount()).isEqualTo(30.0);
    }

    @Test
    void fixedDiscountNeverExceedsSubtotal() {
        PromotionCalculation calc = engine.evaluate(fixed(500), ctx(120));
        assertThat(calc.valid()).isTrue();
        assertThat(calc.discountAmount()).isEqualTo(120.0);
    }

    // --- rejections ---

    @Test
    void unknownPromotionIsRejected() {
        PromotionCalculation calc = engine.evaluate(null, ctx(200));
        assertThat(calc.valid()).isFalse();
        assertThat(calc.rejectionReason()).isEqualTo(PromotionRejectionReason.NOT_FOUND);
    }

    @Test
    void inactivePromotionIsRejected() {
        Promotion p = percentage(20);
        p.setActive(false);
        assertThat(engine.evaluate(p, ctx(200)).rejectionReason())
                .isEqualTo(PromotionRejectionReason.INACTIVE);
    }

    @Test
    void notYetStartedPromotionIsRejected() {
        Promotion p = percentage(20);
        p.setStartDate(NOW.plusDays(1));
        assertThat(engine.evaluate(p, ctx(200)).rejectionReason())
                .isEqualTo(PromotionRejectionReason.NOT_STARTED);
    }

    @Test
    void expiredPromotionIsRejected() {
        Promotion p = percentage(20);
        p.setEndDate(NOW.minusDays(1));
        assertThat(engine.evaluate(p, ctx(200)).rejectionReason())
                .isEqualTo(PromotionRejectionReason.EXPIRED);
    }

    @Test
    void globalUsageLimitReachedIsRejected() {
        Promotion p = percentage(20);
        p.setMaxGlobalUsage(5);
        p.setUsageCount(5);
        assertThat(engine.evaluate(p, ctx(200)).rejectionReason())
                .isEqualTo(PromotionRejectionReason.USAGE_LIMIT_REACHED);
    }

    @Test
    void perCustomerLimitReachedIsRejected() {
        Promotion p = percentage(20);
        p.setMaxUsagePerCustomer(2);
        PromotionContext ctx = new PromotionContext(200, 30, "a@b.com", 1L, true, 2, NOW);
        assertThat(engine.evaluate(p, ctx).rejectionReason())
                .isEqualTo(PromotionRejectionReason.CUSTOMER_LIMIT_REACHED);
    }

    @Test
    void belowMinimumOrderAmountIsRejected() {
        Promotion p = percentage(20);
        p.setMinOrderAmount(300.0);
        assertThat(engine.evaluate(p, ctx(200)).rejectionReason())
                .isEqualTo(PromotionRejectionReason.MINIMUM_NOT_MET);
    }

    @Test
    void firstOrderOnlyRejectsReturningCustomer() {
        Promotion p = percentage(20);
        p.setCustomerEligibility(CustomerEligibility.FIRST_ORDER_ONLY);
        PromotionContext returning = new PromotionContext(200, 30, "a@b.com", 1L, false, 0, NOW);
        assertThat(engine.evaluate(p, returning).rejectionReason())
                .isEqualTo(PromotionRejectionReason.FIRST_ORDER_ONLY);
    }

    @Test
    void firstOrderOnlyAllowsFirstOrder() {
        Promotion p = percentage(20);
        p.setCustomerEligibility(CustomerEligibility.FIRST_ORDER_ONLY);
        assertThat(engine.evaluate(p, ctx(200)).valid()).isTrue();
    }

    @Test
    void selectedCustomersRejectsNonListedCustomer() {
        Promotion p = percentage(20);
        p.setCustomerEligibility(CustomerEligibility.SELECTED_CUSTOMERS);
        p.setEligibleCustomerIds(Set.of(99L));
        assertThat(engine.evaluate(p, ctx(200)).rejectionReason())
                .isEqualTo(PromotionRejectionReason.NOT_ELIGIBLE_CUSTOMER);
    }

    @Test
    void selectedCustomersAllowsListedCustomer() {
        Promotion p = percentage(20);
        p.setCustomerEligibility(CustomerEligibility.SELECTED_CUSTOMERS);
        p.setEligibleCustomerIds(Set.of(1L));
        assertThat(engine.evaluate(p, ctx(200)).valid()).isTrue();
    }

    @Test
    void zeroDiscountIsRejectedAsNoDiscount() {
        PromotionCalculation calc = engine.evaluate(fixed(0.0001), new PromotionContext(
                200, 30, "a@b.com", 1L, true, 0, NOW));
        // 0.0001 rounds to 0.00 → NO_DISCOUNT
        assertThat(calc.valid()).isFalse();
        assertThat(calc.rejectionReason()).isEqualTo(PromotionRejectionReason.NO_DISCOUNT);
    }
}
