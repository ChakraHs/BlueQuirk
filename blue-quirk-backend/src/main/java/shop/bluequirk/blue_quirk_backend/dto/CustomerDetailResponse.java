package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;

/** Full customer profile for the admin: aggregates + complete order history. */
public record CustomerDetailResponse(
        CustomerResponse customer,
        String address,
        String postalCode,
        List<OrderResponse> orders
) {}
