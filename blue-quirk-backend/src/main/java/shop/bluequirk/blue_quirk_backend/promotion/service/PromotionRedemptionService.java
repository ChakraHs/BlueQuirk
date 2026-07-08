package shop.bluequirk.blue_quirk_backend.promotion.service;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.promotion.domain.PromotionRejectionReason;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PromotionCalculation;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PromotionContext;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PromotionEngine;
import shop.bluequirk.blue_quirk_backend.promotion.entity.Promotion;
import shop.bluequirk.blue_quirk_backend.promotion.entity.PromotionUsage;
import shop.bluequirk.blue_quirk_backend.promotion.repository.PromotionRepository;
import shop.bluequirk.blue_quirk_backend.promotion.repository.PromotionUsageRepository;

/**
 * Bridges the pure {@link PromotionEngine} to persistence: resolves a coupon
 * code, feeds the engine the server-side usage counts, and — at checkout —
 * atomically claims a usage slot and records the redemption.
 *
 * <p><b>Concurrency:</b> the hard guarantee that concurrent checkouts can never
 * exceed a promotion's global limit comes from
 * {@link PromotionRepository#tryClaimUsageSlot} — a single conditional UPDATE.
 * The engine's own limit check is only a fast pre-filter for a friendly message.
 */
@Service
public class PromotionRedemptionService {

    private final PromotionRepository promotionRepository;
    private final PromotionUsageRepository usageRepository;
    private final PromotionEngine engine;

    public PromotionRedemptionService(PromotionRepository promotionRepository,
                                      PromotionUsageRepository usageRepository,
                                      PromotionEngine engine) {
        this.promotionRepository = promotionRepository;
        this.usageRepository = usageRepository;
        this.engine = engine;
    }

    /** Immutable checkout identity used to evaluate customer-scoped rules. */
    public record CustomerRef(Long customerId, Long userId, String email, boolean firstOrder) {
        public String normalizedEmail() {
            return email == null ? null : email.trim().toLowerCase();
        }
    }

    /**
     * Read-only evaluation for the coupon-preview endpoint — validates and
     * computes the discount but claims nothing and writes nothing.
     */
    @Transactional(readOnly = true)
    public PromotionCalculation preview(String code, double subtotal, double shipping, CustomerRef ref) {
        Promotion promotion = findByCode(code);
        if (promotion == null) {
            return PromotionCalculation.rejected(PromotionRejectionReason.NOT_FOUND);
        }
        return engine.evaluate(promotion, contextFor(promotion, subtotal, shipping, ref));
    }

    /**
     * Validates a coupon and atomically reserves one usage slot for an in-flight
     * order. Must run inside the caller's order transaction: if the order later
     * rolls back, the claim rolls back with it (no leaked usage). Throws a 400
     * {@link ResponseStatusException} with a customer-safe message on rejection.
     */
    @Transactional
    public AppliedPromotion apply(String code, double subtotal, double shipping, CustomerRef ref) {
        Promotion promotion = findByCode(code);
        if (promotion == null) {
            throw reject(PromotionRejectionReason.NOT_FOUND);
        }

        PromotionCalculation calc = engine.evaluate(promotion, contextFor(promotion, subtotal, shipping, ref));
        if (!calc.valid()) {
            throw reject(calc.rejectionReason());
        }

        // Hard, race-safe global-limit gate.
        int claimed = promotionRepository.tryClaimUsageSlot(promotion.getId(), Instant.now());
        if (claimed == 0) {
            throw reject(PromotionRejectionReason.USAGE_LIMIT_REACHED);
        }

        return new AppliedPromotion(promotion.getId(), promotion.getCode(),
                promotion.getDiscountType(), calc.discountAmount());
    }

    /**
     * Records a confirmed redemption once the order id is known and accrues the
     * analytics aggregates. Called after the order row is persisted, within the
     * same transaction as {@link #apply}.
     */
    @Transactional
    public void recordUsage(AppliedPromotion applied, Long orderId, CustomerRef ref,
                            double originalTotal) {
        Promotion promotion = promotionRepository.getReferenceById(applied.promotionId());

        PromotionUsage usage = new PromotionUsage();
        usage.setPromotion(promotion);
        usage.setOrderId(orderId);
        usage.setUserId(ref == null ? null : ref.userId());
        usage.setCustomerId(ref == null ? null : ref.customerId());
        usage.setCustomerEmail(ref == null ? null : ref.normalizedEmail());
        usage.setDiscountAmount(applied.discountAmount());
        usage.setOrderTotal(originalTotal);
        usageRepository.save(usage);

        promotionRepository.addRedemptionTotals(applied.promotionId(),
                applied.discountAmount(), originalTotal);
    }

    private PromotionContext contextFor(Promotion promotion, double subtotal, double shipping,
                                        CustomerRef ref) {
        long customerUsage = 0;
        String email = ref == null ? null : ref.normalizedEmail();
        if (email != null && promotion.getMaxUsagePerCustomer() != null) {
            customerUsage = usageRepository.countByPromotionIdAndCustomerEmailIgnoreCase(
                    promotion.getId(), email);
        }
        boolean firstOrder = ref != null && ref.firstOrder();
        Long customerId = ref == null ? null : ref.customerId();
        return PromotionContext.of(subtotal, shipping, email, customerId, firstOrder, customerUsage);
    }

    private Promotion findByCode(String code) {
        if (code == null || code.isBlank()) return null;
        return promotionRepository.findByCodeIgnoreCase(code.trim()).orElse(null);
    }

    private ResponseStatusException reject(PromotionRejectionReason reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason.getDefaultMessage());
    }
}
