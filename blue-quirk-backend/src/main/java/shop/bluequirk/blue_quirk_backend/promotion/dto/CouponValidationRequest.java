package shop.bluequirk.blue_quirk_backend.promotion.dto;

import java.util.List;

/**
 * Coupon-preview request from the storefront. The server reloads product prices
 * from the catalog — only product ids and quantities are trusted; any client
 * price/subtotal is ignored. Email is optional and used only to evaluate
 * customer-scoped rules (per-customer limit, first-order, selected customers).
 */
public record CouponValidationRequest(
        String code,
        String email,
        List<Item> items
) {
    public record Item(Long productId, int quantity) {}
}
