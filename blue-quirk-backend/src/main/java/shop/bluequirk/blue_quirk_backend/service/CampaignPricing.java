package shop.bluequirk.blue_quirk_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Centralizes the TEMPORARY marketing-campaign pricing lever so it lives in
 * exactly one place and is fully reversible via config — no catalog data is
 * mutated: a flat <b>price surcharge</b> added to every product's selling price.
 * The product's stored base price is never changed, so resetting the property to
 * its default ({@code campaign.price-surcharge=0}) restores the original
 * behaviour exactly. Both display (product responses) and charging (cart pricing
 * / orders / coupons) go through this component so the customer is always shown
 * what they will actually be charged.
 *
 * <p>Shipping is intentionally NOT handled here: the customer shipping price is
 * an admin setting (see {@code StoreSettings.shippingFee}) and is the single
 * source of truth — setting it to 0 makes the whole storefront show free
 * shipping, with no code change and no campaign override.
 */
@Component
public class CampaignPricing {

    private final double priceSurcharge;

    public CampaignPricing(
            @Value("${campaign.price-surcharge:0}") double priceSurcharge) {
        // A negative surcharge would silently discount the catalog — clamp it out.
        this.priceSurcharge = Math.max(0, priceSurcharge);
    }

    /** The customer-facing selling price for a catalog base price (base + surcharge). */
    public double sellingPrice(double basePrice) {
        return round(basePrice + priceSurcharge);
    }

    /** The flat surcharge currently added to every selling price (0 when inactive). */
    public double priceSurcharge() {
        return priceSurcharge;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
