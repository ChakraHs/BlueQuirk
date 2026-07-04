package shop.bluequirk.blue_quirk_backend.analytics.dto;

/**
 * Per-product funnel for {@code GET /api/admin/analytics/products}. Views come
 * from product page views; add-to-cart / buy-now / wishlist from tracker events;
 * purchases from the authoritative order line items. Conversion = purchases /
 * unique views.
 */
public record ProductStatResponse(
        Long productId,
        String name,
        String image,
        long views,
        long uniqueViews,
        long addToCart,
        long buyNow,
        long checkoutStarts,
        long purchases,
        long wishlist,
        double conversionRate // %
) {}
