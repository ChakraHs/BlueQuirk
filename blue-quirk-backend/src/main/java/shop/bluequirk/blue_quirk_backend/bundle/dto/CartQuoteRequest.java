package shop.bluequirk.blue_quirk_backend.bundle.dto;

import java.util.List;

/**
 * A storefront request to price a cart authoritatively (subtotal, shipping,
 * automatic bundle discount and an optional coupon). Only product ids + quantities
 * are trusted; every price is re-read from the catalog server-side.
 */
public record CartQuoteRequest(
        List<Line> items,
        String couponCode,
        String email
) {
    public record Line(Long productId, int quantity) {}
}
