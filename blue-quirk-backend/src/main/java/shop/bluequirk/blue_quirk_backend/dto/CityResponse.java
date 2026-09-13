package shop.bluequirk.blue_quirk_backend.dto;

import shop.bluequirk.blue_quirk_backend.entity.City;

/** Full city view for the admin (includes the internal real cost). */
public record CityResponse(
        Long id,
        String name,
        double shippingFee,
        double realShippingCost,
        boolean active,
        int sortOrder
) {
    public static CityResponse from(City c) {
        return new CityResponse(
                c.getId(), c.getName(), c.getShippingFee(),
                c.getRealShippingCost(), c.isActive(), c.getSortOrder());
    }
}
