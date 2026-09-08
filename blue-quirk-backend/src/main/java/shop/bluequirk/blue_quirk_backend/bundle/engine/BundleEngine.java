package shop.bluequirk.blue_quirk_backend.bundle.engine;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.bundle.entity.BundleOffer;

/**
 * The reusable, side-effect-free heart of the bundle module. Given an offer and
 * the eligible units of a cart, it forms complete bundle groups (respecting the
 * mix &amp; match rules) and computes the total discount per the offer's pricing
 * method. It performs no I/O and mutates nothing, so it is shared unchanged by the
 * storefront quote endpoint and by checkout (order creation).
 *
 * <p><b>Group-based, over-minimum safe:</b> every complete group of
 * {@code minQuantity} eligible units is priced as one bundle; leftover units bill
 * normally. So "Buy 2 → 349" turns 4 items into 2 bundles and 3 items into 1
 * bundle + 1 normal item — never a silently wrong discount. This also generalizes
 * cleanly to multi-tier offers later.
 */
@Component
public class BundleEngine {

    /**
     * Evaluates {@code offer} against {@code units} (each already server-priced).
     * Never throws for a business "does not apply" outcome — returns
     * {@link BundleCalculation#none()} instead.
     */
    public BundleCalculation evaluate(BundleOffer offer, List<EligibleUnit> units) {
        if (offer == null || units == null) return BundleCalculation.none();
        int n = offer.getMinQuantity();
        if (n < 2 || units.size() < n) return BundleCalculation.none();

        List<List<EligibleUnit>> groups = formGroups(offer, units);
        if (groups.isEmpty()) return BundleCalculation.none();

        double totalDiscount = 0;
        double groupNormalTotal = 0;
        int bundledUnits = 0;
        for (List<EligibleUnit> group : groups) {
            double groupNormal = group.stream().mapToDouble(EligibleUnit::unitPrice).sum();
            totalDiscount += discountForGroup(offer, groupNormal);
            groupNormalTotal += groupNormal;
            bundledUnits += group.size();
        }

        totalDiscount = round(totalDiscount);
        if (totalDiscount <= 0) return BundleCalculation.none();
        return new BundleCalculation(true, totalDiscount, bundledUnits, groups.size(), round(groupNormalTotal));
    }

    /** Splits eligible units into complete groups of {@code minQuantity}. */
    private List<List<EligibleUnit>> formGroups(BundleOffer offer, List<EligibleUnit> units) {
        int n = offer.getMinQuantity();
        if (!offer.isAllowMixing()) {
            return groupPerProduct(units, n);
        }
        if (offer.isAllowSameProduct()) {
            return groupPooled(units, n);
        }
        return groupPooledDistinct(units, n);
    }

    /** Mixing off: each bundle is {@code n} units of the SAME product. */
    private List<List<EligibleUnit>> groupPerProduct(List<EligibleUnit> units, int n) {
        // Preserve determinism: bucket by product, then chunk each bucket.
        java.util.Map<Long, List<EligibleUnit>> byProduct = new java.util.LinkedHashMap<>();
        List<EligibleUnit> sorted = new ArrayList<>(units);
        sorted.sort(Comparator.comparingDouble(EligibleUnit::unitPrice).reversed());
        for (EligibleUnit u : sorted) {
            byProduct.computeIfAbsent(u.productId(), k -> new ArrayList<>()).add(u);
        }
        List<List<EligibleUnit>> groups = new ArrayList<>();
        for (List<EligibleUnit> bucket : byProduct.values()) {
            for (int i = 0; i + n <= bucket.size(); i += n) {
                groups.add(new ArrayList<>(bucket.subList(i, i + n)));
            }
        }
        return groups;
    }

    /** Mixing on, same product allowed: pool everything, chunk by price desc. */
    private List<List<EligibleUnit>> groupPooled(List<EligibleUnit> units, int n) {
        List<EligibleUnit> sorted = new ArrayList<>(units);
        sorted.sort(Comparator.comparingDouble(EligibleUnit::unitPrice).reversed());
        List<List<EligibleUnit>> groups = new ArrayList<>();
        for (int i = 0; i + n <= sorted.size(); i += n) {
            groups.add(new ArrayList<>(sorted.subList(i, i + n)));
        }
        return groups;
    }

    /**
     * Mixing on, same product NOT allowed: greedily build groups of {@code n} units
     * from DISTINCT products, taking the highest-priced eligible unit each time.
     */
    private List<List<EligibleUnit>> groupPooledDistinct(List<EligibleUnit> units, int n) {
        LinkedList<EligibleUnit> remaining = new LinkedList<>(units);
        remaining.sort(Comparator.comparingDouble(EligibleUnit::unitPrice).reversed());
        List<List<EligibleUnit>> groups = new ArrayList<>();
        while (true) {
            List<EligibleUnit> group = new ArrayList<>(n);
            Set<Long> usedProducts = new HashSet<>();
            var it = remaining.iterator();
            while (it.hasNext() && group.size() < n) {
                EligibleUnit u = it.next();
                if (usedProducts.add(u.productId())) {
                    group.add(u);
                    it.remove();
                }
            }
            if (group.size() == n) {
                groups.add(group);
            } else {
                break; // not enough distinct products left to complete another group
            }
        }
        return groups;
    }

    /** The discount for one completed group given its normal price. */
    private double discountForGroup(BundleOffer offer, double groupNormal) {
        return switch (offer.getPricingMethod()) {
            case FIXED_BUNDLE_PRICE -> Math.max(0, groupNormal - offer.getBundleValue());
            case PERCENTAGE_DISCOUNT -> groupNormal * clampPercent(offer.getBundleValue()) / 100.0;
            case FIXED_AMOUNT_DISCOUNT -> Math.min(Math.max(0, offer.getBundleValue()), groupNormal);
        };
    }

    private double clampPercent(double value) {
        return Math.max(0, Math.min(100, value));
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
