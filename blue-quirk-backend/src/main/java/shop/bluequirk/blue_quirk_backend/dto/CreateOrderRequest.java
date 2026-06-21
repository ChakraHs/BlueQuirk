package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;

/**
 * Payload for placing a cash-on-delivery order. Prices are NOT trusted from the
 * client — the server re-reads each product's price. Display fields (name/image/
 * variant) are snapshotted from what the customer saw.
 */
public record CreateOrderRequest(
        String customerName,
        String phone,
        String city,
        String address,
        String note,
        List<Item> items
) {
    public record Item(
            Long productId,
            int quantity,
            String name,
            String image,
            String variant
    ) {}
}
