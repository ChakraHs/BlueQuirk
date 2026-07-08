package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;
import java.util.Map;

/**
 * Payload for placing a cash-on-delivery order. Prices are NOT trusted from the
 * client — the server re-reads each product's price. Display fields (name/image/
 * variant) are snapshotted from what the customer saw.
 */
public record CreateOrderRequest(
        String firstName,
        String lastName,
        String email,
        String phone,
        String city,
        String address,
        String postalCode,
        String note,
        // Kept for backward compatibility: older clients sent a single full name.
        // When firstName/lastName are present they take precedence.
        String customerName,
        // Optional coupon code. The server re-validates it and recomputes the
        // discount from catalog prices — the client's discount/total is ignored.
        String couponCode,
        List<Item> items
) {
    public record Item(
            Long productId,
            int quantity,
            String name,
            String image,
            String variant,
            // Structured variant selection (e.g. {"Size":"M","Color":"Black"}),
            // used to send the exact variant to Todify. Optional/back-compatible.
            Map<String, String> variantAttributes
    ) {}
}
