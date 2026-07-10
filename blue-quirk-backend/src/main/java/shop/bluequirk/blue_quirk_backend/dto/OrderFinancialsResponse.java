package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;

/**
 * Admin-only financial breakdown of a single order, including confidential cost
 * and profit figures. Served ONLY from the admin-authenticated order-financials
 * endpoint — never from the public {@link OrderResponse} used by order tracking
 * or a customer's own order history.
 */
public record OrderFinancialsResponse(
        Long orderId,
        String orderNumber,
        // Order-level accounting (all snapshotted at order time, MAD).
        double sellingTotal,   // goods revenue (subtotal, pre-discount)
        double costTotal,      // Σ(cost × qty)
        double discount,
        double shipping,
        double finalTotal,     // amount the customer pays
        double grossProfit,    // sellingTotal − costTotal
        double marginPercent,  // grossProfit / sellingTotal
        double netSales,       // sellingTotal − discount
        double operationalRevenue, // sellingTotal + shipping
        List<Item> items
) {
    public record Item(
            Long productId,
            String name,
            String sku,
            double sellingPrice, // unit price at purchase
            double costPrice,    // unit cost at purchase
            int quantity,
            double lineTotal,
            double lineCost,
            double lineProfit
    ) {}
}
