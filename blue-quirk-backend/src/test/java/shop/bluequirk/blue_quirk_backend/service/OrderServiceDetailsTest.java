package shop.bluequirk.blue_quirk_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.bundle.service.BundlePricingService;
import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.dto.OrderContributionSummary;
import shop.bluequirk.blue_quirk_backend.entity.Order;
import shop.bluequirk.blue_quirk_backend.entity.OrderAuditLog;
import shop.bluequirk.blue_quirk_backend.finance.service.FinancialCalculationService;
import shop.bluequirk.blue_quirk_backend.identity.user.CurrentUserService;
import shop.bluequirk.blue_quirk_backend.progressive.service.ProgressiveDiscountService;
import shop.bluequirk.blue_quirk_backend.promotion.service.PromotionRedemptionService;
import shop.bluequirk.blue_quirk_backend.repository.OrderAuditLogRepository;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;
import shop.bluequirk.blue_quirk_backend.repository.TodifySyncLogRepository;

/**
 * Net-contribution roll-up and the operational-fields edit: validation, total
 * re-derivation when the shipping fee changes, and the audit trail. A real
 * {@link FinancialCalculationService} is used (as a spy) so the contribution
 * formula is exercised end-to-end.
 */
@ExtendWith(MockitoExtension.class)
class OrderServiceDetailsTest {

    @Mock OrderRepository orderRepository;
    @Mock OrderNotificationService notificationService;
    @Mock CustomerService customerService;
    @Mock ApplicationEventPublisher events;
    @Mock PricingService pricingService;
    @Mock PromotionRedemptionService promotionRedemptionService;
    @Mock BundlePricingService bundlePricingService;
    @Mock ProgressiveDiscountService progressiveDiscountService;
    @Spy FinancialCalculationService finance = new FinancialCalculationService();
    @Mock StoreSettingsService storeSettingsService;
    @Mock CityService cityService;
    @Mock CurrentUserService currentUserService;
    @Mock OrderAuditLogRepository auditRepository;
    @Mock TodifySyncLogRepository todifyLogRepository;

    @InjectMocks OrderService service;

    private Order order(OrderStatus status) {
        Order o = new Order();
        o.setId(1L);
        o.setStatus(status);
        o.setSubtotal(200);
        o.setShippingFee(30);
        o.setDiscountAmount(0);
        o.setTotal(230);
        o.setCostTotal(100);
        o.setRealShippingCost(20);
        o.setPackagingCost(5);
        o.setCustomerName("Sara");
        o.setPhone("0600000000");
        o.setCity("Casablanca");
        o.setAddress("1 rue X");
        return o;
    }

    @Test
    void contributions_computeNetAndRealizedFlags() {
        Order delivered = order(OrderStatus.DELIVERED);
        Order cancelled = order(OrderStatus.CANCELLED);
        when(orderRepository.findAll()).thenReturn(List.of(delivered, cancelled));

        List<OrderContributionSummary> rows = service.getAllOrderContributions();

        // total(230) − cost(100) − delivery(20) − packaging(5) = 105
        assertThat(rows.get(0).netContribution()).isEqualTo(105);
        assertThat(rows.get(0).realized()).isTrue();
        assertThat(rows.get(0).cancelled()).isFalse();
        // Cancelled: same figure but never realized.
        assertThat(rows.get(1).realized()).isFalse();
        assertThat(rows.get(1).cancelled()).isTrue();
    }

    @Test
    void updateDetails_rejectsNegativeAmount() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order(OrderStatus.CONFIRMED)));

        assertThatThrownBy(() ->
                service.updateOrderDetails(1L, -5.0, null, null, null, null, null))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void updateDetails_recomputesTotal_whenShippingChanges_andAudits() {
        Order o = order(OrderStatus.CONFIRMED);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(o));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        service.updateOrderDetails(1L, null, 50.0, null, null, null, null);

        // total = subtotal(200) − discount(0) + shipping(50) = 250
        assertThat(o.getShippingFee()).isEqualTo(50);
        assertThat(o.getTotal()).isEqualTo(250);
        assertThat(o.getOriginalTotal()).isEqualTo(250);
        verify(auditRepository, atLeastOnce()).save(any(OrderAuditLog.class));
    }

    @Test
    void updateDetails_editsAddressCityNote_withoutChangingTotal() {
        Order o = order(OrderStatus.CONFIRMED);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(o));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        service.updateOrderDetails(1L, null, null, null, "42 av. Hassan II", "Rabat", "Call before 6pm");

        assertThat(o.getAddress()).isEqualTo("42 av. Hassan II");
        assertThat(o.getCity()).isEqualTo("Rabat");
        assertThat(o.getNote()).isEqualTo("Call before 6pm");
        assertThat(o.getTotal()).isEqualTo(230); // unchanged
        verify(auditRepository, atLeastOnce()).save(any(OrderAuditLog.class));
    }
}
