package shop.bluequirk.blue_quirk_backend.bundle.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.bundle.domain.BundleEligibility;
import shop.bluequirk.blue_quirk_backend.bundle.engine.BundleCalculation;
import shop.bluequirk.blue_quirk_backend.bundle.engine.BundleEngine;
import shop.bluequirk.blue_quirk_backend.bundle.engine.EligibleUnit;
import shop.bluequirk.blue_quirk_backend.bundle.entity.BundleOffer;
import shop.bluequirk.blue_quirk_backend.bundle.repository.BundleOfferRepository;
import shop.bluequirk.blue_quirk_backend.entity.Category;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.service.PricingService.PricedCart;
import shop.bluequirk.blue_quirk_backend.service.PricingService.PricedLine;

/**
 * Resolves the authoritative automatic bundle discount for a priced cart. This is
 * the single source of truth for bundle pricing — used identically by the
 * storefront quote endpoint (display) and by checkout (the amount actually
 * charged), so the two can never drift. The client's prices are never consulted;
 * it only ever sees a {@link PricedCart} built from the catalog.
 *
 * <p>When several enabled offers could apply, the one yielding the <b>largest</b>
 * discount wins (priority breaks ties first). Exactly one bundle offer applies per
 * order — never stacked — which keeps the outcome predictable and non-abusable.
 */
@Service
public class BundlePricingService {

    private final BundleOfferRepository offerRepository;
    private final BundleEngine engine;

    public BundlePricingService(BundleOfferRepository offerRepository, BundleEngine engine) {
        this.offerRepository = offerRepository;
        this.engine = engine;
    }

    /**
     * Computes the best applicable bundle discount for the priced cart, or
     * {@code null} when no enabled offer applies (normal pricing continues).
     */
    @Transactional(readOnly = true)
    public AppliedBundle bestFor(PricedCart cart) {
        if (cart == null || cart.lines() == null || cart.lines().isEmpty()) return null;

        List<BundleOffer> offers = offerRepository.findByActiveTrueOrderByPriorityDescIdDesc();
        if (offers.isEmpty()) return null;

        AppliedBundle best = null;
        for (BundleOffer offer : offers) {
            List<EligibleUnit> units = eligibleUnits(offer, cart.lines());
            BundleCalculation calc = engine.evaluate(offer, units);
            if (!calc.applies()) continue;

            // Offers are pre-sorted by priority desc, so a strictly greater discount
            // wins and equal discounts keep the higher-priority offer already picked.
            if (best == null || calc.discountAmount() > best.discountAmount()) {
                best = new AppliedBundle(offer.getId(), offer.getName(),
                        calc.discountAmount(), calc.bundledUnits(),
                        calc.groups(), calc.groupNormalTotal());
            }
        }
        return best;
    }

    /** Expands the cart's eligible lines into individual units for the engine. */
    private List<EligibleUnit> eligibleUnits(BundleOffer offer, List<PricedLine> lines) {
        List<EligibleUnit> units = new ArrayList<>();
        for (PricedLine line : lines) {
            if (!isEligible(offer, line.product())) continue;
            for (int i = 0; i < line.quantity(); i++) {
                units.add(new EligibleUnit(line.product().getId(), line.unitPrice()));
            }
        }
        return units;
    }

    /**
     * A "you're almost there" hint for the cart: an offer that has some eligible
     * units in the cart but not yet enough to complete a set. {@code setPrice} is
     * only meaningful (&gt; 0) for a fixed bundle price.
     */
    public record Upsell(Long offerId, String label, int minQuantity,
                         int unitsInCart, int unitsNeeded, double setPrice) {}

    /**
     * Finds the best upsell opportunity for a priced cart: the highest-priority
     * enabled offer that has at least one eligible unit but fewer than a full set.
     * Returns {@code null} when a bundle already applies or none is close.
     */
    @Transactional(readOnly = true)
    public Upsell upsellFor(PricedCart cart) {
        if (cart == null || cart.lines() == null || cart.lines().isEmpty()) return null;
        // If a bundle already applies, there is nothing to upsell.
        if (bestFor(cart) != null) return null;

        for (BundleOffer offer : offerRepository.findByActiveTrueOrderByPriorityDescIdDesc()) {
            int units = eligibleUnits(offer, cart.lines()).size();
            if (units > 0 && units < offer.getMinQuantity()) {
                double setPrice = offer.getPricingMethod()
                        == shop.bluequirk.blue_quirk_backend.bundle.domain.BundlePricingMethod.FIXED_BUNDLE_PRICE
                        ? offer.getBundleValue() : 0;
                return new Upsell(offer.getId(), offer.getName(), offer.getMinQuantity(),
                        units, offer.getMinQuantity() - units, setPrice);
            }
        }
        return null;
    }

    /**
     * Accrues one redemption's analytics onto the winning offer. Must run inside
     * the order transaction so it rolls back with the order on failure. No-op for a
     * null application (no bundle applied).
     */
    @Transactional
    public void recordUsage(AppliedBundle applied) {
        if (applied == null || applied.offerId() == null) return;
        offerRepository.addRedemptionTotals(applied.offerId(), applied.discountAmount());
    }

    /** Whether a product falls within an offer's configured scope. */
    public boolean isEligible(BundleOffer offer, Product product) {
        if (product == null) return false;
        return switch (offer.getEligibility()) {
            case ALL_PRODUCTS -> true;
            case SELECTED_PRODUCTS ->
                    offer.getEligibleProductIds() != null
                            && offer.getEligibleProductIds().contains(product.getId());
            case CATEGORY -> {
                Set<Long> wanted = offer.getEligibleCategoryIds();
                if (wanted == null || wanted.isEmpty()) yield false;
                Set<Long> productCats = product.getCategories() == null ? Set.of()
                        : product.getCategories().stream().map(Category::getId).collect(Collectors.toSet());
                yield productCats.stream().anyMatch(wanted::contains);
            }
        };
    }
}
