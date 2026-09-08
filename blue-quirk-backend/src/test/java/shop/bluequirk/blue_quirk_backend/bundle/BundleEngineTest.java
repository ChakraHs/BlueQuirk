package shop.bluequirk.blue_quirk_backend.bundle;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import shop.bluequirk.blue_quirk_backend.bundle.domain.BundleEligibility;
import shop.bluequirk.blue_quirk_backend.bundle.domain.BundlePricingMethod;
import shop.bluequirk.blue_quirk_backend.bundle.engine.BundleCalculation;
import shop.bluequirk.blue_quirk_backend.bundle.engine.BundleEngine;
import shop.bluequirk.blue_quirk_backend.bundle.engine.EligibleUnit;
import shop.bluequirk.blue_quirk_backend.bundle.entity.BundleOffer;

/** Unit tests for the pure, group-based bundle discount engine. */
class BundleEngineTest {

    private final BundleEngine engine = new BundleEngine();

    private BundleOffer fixedPrice(int minQty, double price) {
        BundleOffer o = new BundleOffer();
        o.setName("Build Your Bloom Set");
        o.setMinQuantity(minQty);
        o.setPricingMethod(BundlePricingMethod.FIXED_BUNDLE_PRICE);
        o.setBundleValue(price);
        o.setEligibility(BundleEligibility.CATEGORY);
        o.setAllowMixing(true);
        o.setAllowSameProduct(true);
        return o;
    }

    private EligibleUnit unit(long productId, double price) {
        return new EligibleUnit(productId, price);
    }

    // --- core Bloom case: buy 2 (mix & match) for 349 ---

    @Test
    void twoMixedItemsGetBundlePriceAndCorrectSaving() {
        // Bloom Daisy (199) + Bloom Lavender (199) = 398 normal → 349 bundle, save 49.
        BundleCalculation calc = engine.evaluate(fixedPrice(2, 349),
                List.of(unit(1, 199), unit(2, 199)));

        assertThat(calc.applies()).isTrue();
        assertThat(calc.discountAmount()).isEqualTo(49.0);
        assertThat(calc.bundledUnits()).isEqualTo(2);
        assertThat(calc.groups()).isEqualTo(1);
        assertThat(calc.groupNormalTotal()).isEqualTo(398.0);
    }

    @Test
    void oneItemDoesNotApply() {
        BundleCalculation calc = engine.evaluate(fixedPrice(2, 349), List.of(unit(1, 199)));
        assertThat(calc.applies()).isFalse();
        assertThat(calc.discountAmount()).isZero();
    }

    @Test
    void twoIdenticalItemsQualifyWhenSameProductAllowed() {
        BundleCalculation calc = engine.evaluate(fixedPrice(2, 349),
                List.of(unit(1, 199), unit(1, 199)));
        assertThat(calc.applies()).isTrue();
        assertThat(calc.discountAmount()).isEqualTo(49.0);
    }

    // --- over-minimum quantity: repeats per complete group, leftover normal ---

    @Test
    void threeItemsFormOneBundlePlusOneNormal() {
        // 3 × 199 = 597 normal → 1 bundle (349) + 1 normal (199) = 548 → discount 49.
        BundleCalculation calc = engine.evaluate(fixedPrice(2, 349),
                List.of(unit(1, 199), unit(2, 199), unit(3, 199)));
        assertThat(calc.groups()).isEqualTo(1);
        assertThat(calc.bundledUnits()).isEqualTo(2);
        assertThat(calc.discountAmount()).isEqualTo(49.0);
    }

    @Test
    void fourItemsFormTwoBundles() {
        // 4 × 199 → 2 bundles → discount 2 × 49 = 98.
        BundleCalculation calc = engine.evaluate(fixedPrice(2, 349),
                List.of(unit(1, 199), unit(2, 199), unit(3, 199), unit(4, 199)));
        assertThat(calc.groups()).isEqualTo(2);
        assertThat(calc.bundledUnits()).isEqualTo(4);
        assertThat(calc.discountAmount()).isEqualTo(98.0);
    }

    // --- percentage & fixed-amount pricing methods ---

    @Test
    void percentageDiscountAppliesPerGroup() {
        BundleOffer o = fixedPrice(2, 0);
        o.setPricingMethod(BundlePricingMethod.PERCENTAGE_DISCOUNT);
        o.setBundleValue(10); // 10% off the 398 group
        BundleCalculation calc = engine.evaluate(o, List.of(unit(1, 199), unit(2, 199)));
        assertThat(calc.discountAmount()).isEqualTo(39.8);
    }

    @Test
    void fixedAmountDiscountAppliesPerGroup() {
        BundleOffer o = fixedPrice(2, 0);
        o.setPricingMethod(BundlePricingMethod.FIXED_AMOUNT_DISCOUNT);
        o.setBundleValue(30); // 30 DH off the group
        BundleCalculation calc = engine.evaluate(o, List.of(unit(1, 199), unit(2, 199)));
        assertThat(calc.discountAmount()).isEqualTo(30.0);
    }

    // --- mix & match rules ---

    @Test
    void distinctProductsRequiredWhenSameProductDisallowed() {
        BundleOffer o = fixedPrice(2, 349);
        o.setAllowSameProduct(false);
        // Two units of the SAME product → cannot form a distinct-product bundle.
        BundleCalculation calc = engine.evaluate(o, List.of(unit(1, 199), unit(1, 199)));
        assertThat(calc.applies()).isFalse();
    }

    @Test
    void distinctProductsFormBundleWhenSameProductDisallowed() {
        BundleOffer o = fixedPrice(2, 349);
        o.setAllowSameProduct(false);
        BundleCalculation calc = engine.evaluate(o, List.of(unit(1, 199), unit(2, 199)));
        assertThat(calc.applies()).isTrue();
        assertThat(calc.discountAmount()).isEqualTo(49.0);
    }

    @Test
    void mixingOffGroupsPerProductOnly() {
        BundleOffer o = fixedPrice(2, 349);
        o.setAllowMixing(false);
        // Two DIFFERENT products, one each → no same-product pair → no bundle.
        BundleCalculation noPair = engine.evaluate(o, List.of(unit(1, 199), unit(2, 199)));
        assertThat(noPair.applies()).isFalse();
        // Two of the SAME product → forms a bundle.
        BundleCalculation pair = engine.evaluate(o, List.of(unit(1, 199), unit(1, 199)));
        assertThat(pair.applies()).isTrue();
        assertThat(pair.discountAmount()).isEqualTo(49.0);
    }

    // --- guards ---

    @Test
    void fixedBundlePriceAboveNormalYieldsNoDiscount() {
        // Group normal 398, bundle price 500 → no negative discount, does not apply.
        BundleCalculation calc = engine.evaluate(fixedPrice(2, 500),
                List.of(unit(1, 199), unit(2, 199)));
        assertThat(calc.applies()).isFalse();
        assertThat(calc.discountAmount()).isZero();
    }

    @Test
    void nullOrEmptyInputsNeverThrow() {
        assertThat(engine.evaluate(null, List.of(unit(1, 199))).applies()).isFalse();
        assertThat(engine.evaluate(fixedPrice(2, 349), List.of()).applies()).isFalse();
        assertThat(engine.evaluate(fixedPrice(2, 349), null).applies()).isFalse();
    }
}
