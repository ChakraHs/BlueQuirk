package shop.bluequirk.blue_quirk_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Centralizes the TEMPORARY marketing-campaign pricing levers so they live in
 * exactly one place and are fully reversible via config — no catalog data is
 * mutated:
 * <ul>
 *   <li>a flat <b>price surcharge</b> added to every product's selling price, and</li>
 *   <li>a <b>free-shipping</b> switch that forces the shipping charge to 0.</li>
 * </ul>
 * The product's stored base price and the store's configured shipping fee /
 * threshold are never changed, so resetting these properties to their defaults
 * ({@code campaign.price-surcharge=0}, {@code campaign.free-shipping=false})
 * restores the original behaviour exactly. Both display (product responses) and
 * charging (cart pricing / orders / coupons) go through this component so the
 * customer is always shown what they will actually be charged.
 */
@Component
public class CampaignPricing {

    private final double priceSurcharge;
    private final boolean freeShipping;

    public CampaignPricing(
            @Value("${campaign.price-surcharge:0}") double priceSurcharge,
            @Value("${campaign.free-shipping:false}") boolean freeShipping) {
        // A negative surcharge would silently discount the catalog — clamp it out.
        this.priceSurcharge = Math.max(0, priceSurcharge);
        this.freeShipping = freeShipping;
    }

    /** The customer-facing selling price for a catalog base price (base + surcharge). */
    public double sellingPrice(double basePrice) {
        return round(basePrice + priceSurcharge);
    }

    /** True while the free-shipping campaign is active (shipping forced to 0). */
    public boolean isFreeShipping() {
        return freeShipping;
    }

    /** The flat surcharge currently added to every selling price (0 when inactive). */
    public double priceSurcharge() {
        return priceSurcharge;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
