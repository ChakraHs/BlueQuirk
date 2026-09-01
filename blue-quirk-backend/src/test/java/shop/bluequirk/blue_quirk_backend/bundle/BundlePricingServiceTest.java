package shop.bluequirk.blue_quirk_backend.bundle;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import shop.bluequirk.blue_quirk_backend.bundle.domain.BundleEligibility;
import shop.bluequirk.blue_quirk_backend.bundle.domain.BundlePricingMethod;
import shop.bluequirk.blue_quirk_backend.bundle.engine.BundleEngine;
import shop.bluequirk.blue_quirk_backend.bundle.entity.BundleOffer;
import shop.bluequirk.blue_quirk_backend.bundle.repository.BundleOfferRepository;
import shop.bluequirk.blue_quirk_backend.bundle.service.AppliedBundle;
import shop.bluequirk.blue_quirk_backend.bundle.service.BundlePricingService;
import shop.bluequirk.blue_quirk_backend.entity.Category;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.service.PricingService.PricedCart;
import shop.bluequirk.blue_quirk_backend.service.PricingService.PricedLine;

/** Tests scope-eligibility resolution and best-offer selection over a priced cart. */
class BundlePricingServiceTest {

    private BundleOfferRepository repository;
    private BundlePricingService service;

    private static final long BLOOM_CATEGORY = 5L;
    private static final long OTHER_CATEGORY = 9L;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(BundleOfferRepository.class);
        service = new BundlePricingService(repository, new BundleEngine());
    }

    private Product product(long id, double price, long categoryId) {
        Product p = new Product();
        p.setId(id);
        Category c = new Category();
        c.setId(categoryId);
        p.setCategories(Set.of(c));
        return p;
    }

    private PricedLine line(Product p, double unitPrice, int qty) {
        return new PricedLine(p, unitPrice, qty, unitPrice * qty);
    }

    private BundleOffer bloomOffer(double bundlePrice) {
        BundleOffer o = new BundleOffer();
        o.setId(1L);
        o.setName("Build Your Bloom Set");
        o.setActive(true);
        o.setMinQuantity(2);
        o.setPricingMethod(BundlePricingMethod.FIXED_BUNDLE_PRICE);
        o.setBundleValue(bundlePrice);
        o.setEligibility(BundleEligibility.CATEGORY);
        o.setEligibleCategoryIds(Set.of(BLOOM_CATEGORY));
        o.setAllowMixing(true);
        o.setAllowSameProduct(true);
        return o;
    }

    @Test
    void twoEligibleMixedProductsApplyBundle() {
        when(repository.findByActiveTrueOrderByPriorityDescIdDesc())
                .thenReturn(List.of(bloomOffer(349)));

        PricedCart cart = new PricedCart(List.of(
                line(product(1, 199, BLOOM_CATEGORY), 199, 1),
                line(product(2, 199, BLOOM_CATEGORY), 199, 1)), 398, 0);

        AppliedBundle applied = service.bestFor(cart);
        assertThat(applied).isNotNull();
        assertThat(applied.discountAmount()).isEqualTo(49.0);
        assertThat(applied.label()).isEqualTo("Build Your Bloom Set");
        assertThat(applied.bundledUnits()).isEqualTo(2);
    }

    @Test
    void ineligibleProductsGetNoBundle() {
        when(repository.findByActiveTrueOrderByPriorityDescIdDesc())
                .thenReturn(List.of(bloomOffer(349)));

        PricedCart cart = new PricedCart(List.of(
                line(product(1, 199, OTHER_CATEGORY), 199, 1),
                line(product(2, 199, OTHER_CATEGORY), 199, 1)), 398, 0);

        assertThat(service.bestFor(cart)).isNull();
    }

    @Test
    void mixOfEligibleAndIneligibleOnlyBundlesEligibleUnits() {
        when(repository.findByActiveTrueOrderByPriorityDescIdDesc())
                .thenReturn(List.of(bloomOffer(349)));

        // 2 eligible (form one bundle) + 1 ineligible (billed normally).
        PricedCart cart = new PricedCart(List.of(
                line(product(1, 199, BLOOM_CATEGORY), 199, 1),
                line(product(2, 199, BLOOM_CATEGORY), 199, 1),
                line(product(3, 250, OTHER_CATEGORY), 250, 1)), 648, 0);

        AppliedBundle applied = service.bestFor(cart);
        assertThat(applied).isNotNull();
        assertThat(applied.discountAmount()).isEqualTo(49.0);
        assertThat(applied.bundledUnits()).isEqualTo(2);
    }

    @Test
    void bestOfferWinsWhenSeveralApply() {
        BundleOffer weak = bloomOffer(379); // saves 19
        weak.setId(1L);
        BundleOffer strong = bloomOffer(349); // saves 49
        strong.setId(2L);
        when(repository.findByActiveTrueOrderByPriorityDescIdDesc())
                .thenReturn(List.of(weak, strong));

        PricedCart cart = new PricedCart(List.of(
                line(product(1, 199, BLOOM_CATEGORY), 199, 1),
                line(product(2, 199, BLOOM_CATEGORY), 199, 1)), 398, 0);

        AppliedBundle applied = service.bestFor(cart);
        assertThat(applied.discountAmount()).isEqualTo(49.0);
        assertThat(applied.offerId()).isEqualTo(2L);
    }

    @Test
    void noActiveOffersReturnsNull() {
        when(repository.findByActiveTrueOrderByPriorityDescIdDesc()).thenReturn(List.of());
        PricedCart cart = new PricedCart(List.of(
                line(product(1, 199, BLOOM_CATEGORY), 199, 1)), 199, 0);
        assertThat(service.bestFor(cart)).isNull();
    }
}
