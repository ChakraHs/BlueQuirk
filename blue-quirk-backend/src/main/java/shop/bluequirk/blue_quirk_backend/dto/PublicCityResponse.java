package shop.bluequirk.blue_quirk_backend.dto;

import shop.bluequirk.blue_quirk_backend.entity.City;

/**
 * Storefront-safe city view for the checkout selector: the name and the CUSTOMER
 * delivery fee only. The internal real cost is deliberately never exposed here.
 */
public record PublicCityResponse(String name, double shippingFee) {
    public static PublicCityResponse from(City c) {
        return new PublicCityResponse(c.getName(), c.getShippingFee());
    }
}
