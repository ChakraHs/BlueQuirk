package shop.bluequirk.blue_quirk_backend.promotion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.domain.PromotionRejectionReason;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PromotionCalculation;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PromotionContext;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PromotionEngine;
import shop.bluequirk.blue_quirk_backend.promotion.entity.Promotion;
import shop.bluequirk.blue_quirk_backend.promotion.entity.PromotionUsage;
import shop.bluequirk.blue_quirk_backend.promotion.repository.PromotionRepository;
import shop.bluequirk.blue_quirk_backend.promotion.repository.PromotionUsageRepository;
import shop.bluequirk.blue_quirk_backend.promotion.service.AppliedPromotion;
import shop.bluequirk.blue_quirk_backend.promotion.service.PromotionRedemptionService;
import shop.bluequirk.blue_quirk_backend.promotion.service.PromotionRedemptionService.CustomerRef;

/**
 * Unit tests for redemption: the persistence bridge and — crucially — the
 * atomic global-limit guard that makes concurrent checkouts safe.
 */
class PromotionRedemptionServiceTest {

    @Mock PromotionRepository promotionRepository;
    @Mock PromotionUsageRepository usageRepository;
    @Mock PromotionEngine engine;

    private PromotionRedemptionService service;
    private AutoCloseable mocks;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        service = new PromotionRedemptionService(promotionRepository, usageRepository, engine);
    }

    private Promotion promo() {
        Promotion p = new Promotion();
        p.setId(7L);
        p.setCode("SAVE20");
        p.setDiscountType(DiscountType.PERCENTAGE);
        return p;
    }

    private CustomerRef ref() {
        return new CustomerRef(1L, 2L, "buyer@example.com", true);
    }

    // --- apply (checkout) ---

    @Test
    void applyClaimsSlotAndReturnsDiscountWhenValid() {
        Promotion p = promo();
        when(promotionRepository.findByCodeIgnoreCase("SAVE20")).thenReturn(Optional.of(p));
        when(engine.evaluate(any(), any())).thenReturn(PromotionCalculation.ok(p, 40));
        when(promotionRepository.tryClaimUsageSlot(eq(7L), any(Instant.class))).thenReturn(1);

        AppliedPromotion applied = service.apply("SAVE20", 200, 30, ref());

        assertThat(applied.discountAmount()).isEqualTo(40);
        assertThat(applied.promotionId()).isEqualTo(7L);
        verify(promotionRepository).tryClaimUsageSlot(eq(7L), any(Instant.class));
    }

    @Test
    void applyThrowsAndDoesNotClaimWhenEngineRejects() {
        Promotion p = promo();
        when(promotionRepository.findByCodeIgnoreCase("SAVE20")).thenReturn(Optional.of(p));
        when(engine.evaluate(any(), any()))
                .thenReturn(PromotionCalculation.rejected(PromotionRejectionReason.MINIMUM_NOT_MET));

        assertThatThrownBy(() -> service.apply("SAVE20", 10, 30, ref()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining(PromotionRejectionReason.MINIMUM_NOT_MET.getDefaultMessage());

        verify(promotionRepository, never()).tryClaimUsageSlot(anyLong(), any());
    }

    @Test
    void applyThrowsUsageLimitWhenClaimLosesRace() {
        // Engine's soft check passed, but a concurrent checkout took the last slot:
        // the atomic UPDATE affects 0 rows and we must reject.
        Promotion p = promo();
        when(promotionRepository.findByCodeIgnoreCase("SAVE20")).thenReturn(Optional.of(p));
        when(engine.evaluate(any(), any())).thenReturn(PromotionCalculation.ok(p, 40));
        when(promotionRepository.tryClaimUsageSlot(eq(7L), any(Instant.class))).thenReturn(0);

        assertThatThrownBy(() -> service.apply("SAVE20", 200, 30, ref()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining(PromotionRejectionReason.USAGE_LIMIT_REACHED.getDefaultMessage());

        verify(usageRepository, never()).save(any());
    }

    @Test
    void applyThrowsWhenCodeUnknown() {
        when(promotionRepository.findByCodeIgnoreCase("NOPE")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.apply("NOPE", 200, 30, ref()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining(PromotionRejectionReason.NOT_FOUND.getDefaultMessage());
    }

    // --- recordUsage ---

    @Test
    void recordUsageSavesRowAndAccruesTotals() {
        Promotion p = promo();
        when(promotionRepository.getReferenceById(7L)).thenReturn(p);
        AppliedPromotion applied = new AppliedPromotion(7L, "SAVE20", DiscountType.PERCENTAGE, 40);

        service.recordUsage(applied, 555L, ref(), 230);

        ArgumentCaptor<PromotionUsage> captor = ArgumentCaptor.forClass(PromotionUsage.class);
        verify(usageRepository).save(captor.capture());
        PromotionUsage saved = captor.getValue();
        assertThat(saved.getOrderId()).isEqualTo(555L);
        assertThat(saved.getDiscountAmount()).isEqualTo(40);
        assertThat(saved.getOrderTotal()).isEqualTo(230);
        assertThat(saved.getCustomerEmail()).isEqualTo("buyer@example.com");

        verify(promotionRepository).addRedemptionTotals(7L, 40, 230);
    }

    // --- preview ---

    @Test
    void previewReturnsNotFoundWithoutCallingEngine() {
        when(promotionRepository.findByCodeIgnoreCase("NOPE")).thenReturn(Optional.empty());
        PromotionCalculation calc = service.preview("NOPE", 200, 30, ref());
        assertThat(calc.valid()).isFalse();
        assertThat(calc.rejectionReason()).isEqualTo(PromotionRejectionReason.NOT_FOUND);
        verify(engine, never()).evaluate(any(), any());
    }

    @Test
    void previewCountsPerCustomerUsageWhenLimited() {
        Promotion p = promo();
        p.setMaxUsagePerCustomer(3);
        when(promotionRepository.findByCodeIgnoreCase("SAVE20")).thenReturn(Optional.of(p));
        when(usageRepository.countByPromotionIdAndCustomerEmailIgnoreCase(7L, "buyer@example.com"))
                .thenReturn(2L);
        when(engine.evaluate(any(), any())).thenReturn(PromotionCalculation.ok(p, 40));

        service.preview("SAVE20", 200, 30, ref());

        ArgumentCaptor<PromotionContext> captor = ArgumentCaptor.forClass(PromotionContext.class);
        verify(engine).evaluate(eq(p), captor.capture());
        assertThat(captor.getValue().customerUsageCount()).isEqualTo(2L);
    }
}
