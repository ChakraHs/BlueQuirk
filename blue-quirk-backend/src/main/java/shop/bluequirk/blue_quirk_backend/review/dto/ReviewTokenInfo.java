package shop.bluequirk.blue_quirk_backend.review.dto;

import java.util.List;

/**
 * What the token-gated review submission page needs to render itself: whether the
 * token is still redeemable and the list of products on the order the customer may
 * review. No PII (name/phone/address) is exposed — only product display info.
 */
public record ReviewTokenInfo(
        boolean valid,
        String orderNumber,
        List<TokenProduct> products
) {
    public record TokenProduct(Long productId, String name, String imageUrl) {}

    public static ReviewTokenInfo invalid() {
        return new ReviewTokenInfo(false, null, List.of());
    }
}
