package shop.bluequirk.blue_quirk_backend.dto;

/**
 * Admin create/update payload for a deliverable city. {@code shippingFee} is the
 * customer price (shown + billed); {@code realShippingCost} is internal (profit
 * only). Nulls on update leave the existing value unchanged.
 */
public record CityRequest(
        String name,
        Double shippingFee,
        Double realShippingCost,
        Boolean active,
        Integer sortOrder
) {}
