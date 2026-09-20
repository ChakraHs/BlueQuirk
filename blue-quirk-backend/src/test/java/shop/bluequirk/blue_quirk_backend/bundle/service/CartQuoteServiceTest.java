package shop.bluequirk.blue_quirk_backend.bundle.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import shop.bluequirk.blue_quirk_backend.bundle.dto.CartQuoteRequest;
import shop.bluequirk.blue_quirk_backend.bundle.dto.CartQuoteResponse;
import shop.bluequirk.blue_quirk_backend.progressive.service.ProgressiveDiscountService;
import shop.bluequirk.blue_quirk_backend.promotion.service.PromotionRedemptionService;
import shop.bluequirk.blue_quirk_backend.service.CustomerService;
import shop.bluequirk.blue_quirk_backend.service.PricingService;
import shop.bluequirk.blue_quirk_backend.service.PricingService.PricedCart;
import shop.bluequirk.blue_quirk_backend.service.StoreSettingsService;

/**
 * Locks the cart-quote shipping rule (the "208 vs 179" bug): shipping is only added
 * to the quoted total once a delivery city is known. Before a city is picked the
 * total is items-only — no phantom flat fee — even though a city-less pricing would
 * surface the flat fee. With a city, the authoritative per-city fee is included.
 */
@ExtendWith(MockitoExtension.class)
class CartQuoteServiceTest {

    @Mock private PricingService pricingService;
    @Mock private BundlePricingService bundlePricingService;
    @Mock private ProgressiveDiscountService progressiveDiscountService;
    @Mock private PromotionRedemptionService redemptionService;
    @Mock private CustomerService customerService;
    @Mock private StoreSettingsService storeSettingsService;

    @InjectMocks private CartQuoteService service;

    private static CartQuoteRequest req(String city) {
        return new CartQuoteRequest(List.of(new CartQuoteRequest.Line(1L, 1)), null, null, city);
    }

    @Test
    void noCity_excludesShippingFromTotal() {
        // 179 goods + a 29 flat fee that a city-less pricing would return: the quote
        // must NOT bill the fee before a city is chosen.
        when(pricingService.price(anyList(), isNull()))
                .thenReturn(new PricedCart(List.of(), 179.0, 29.0));
        when(bundlePricingService.bestFor(any())).thenReturn(null);
        when(bundlePricingService.upsellFor(any())).thenReturn(null);
        when(progressiveDiscountService.compute(any(), anyBoolean(), anyBoolean())).thenReturn(null);

        CartQuoteResponse q = service.quote(req(null));

        assertThat(q.shippingFee()).isZero();
        assertThat(q.total()).isEqualTo(179.0);
    }

    @Test
    void withCity_includesPerCityShipping() {
        when(pricingService.price(anyList(), eq("Casablanca")))
                .thenReturn(new PricedCart(List.of(), 179.0, 29.0));
        when(bundlePricingService.bestFor(any())).thenReturn(null);
        when(bundlePricingService.upsellFor(any())).thenReturn(null);
        when(progressiveDiscountService.compute(any(), anyBoolean(), anyBoolean())).thenReturn(null);

        CartQuoteResponse q = service.quote(req("Casablanca"));

        assertThat(q.shippingFee()).isEqualTo(29.0);
        assertThat(q.total()).isEqualTo(208.0);
    }
}
