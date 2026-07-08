package shop.bluequirk.blue_quirk_backend.promotion.dto;

import java.util.List;

/**
 * Aggregate promotion analytics for the admin dashboard. All figures are derived
 * from the persisted redemption data / denormalized totals, so the data model
 * already supports the fuller dashboards described in the spec (most-used,
 * revenue generated, discount given, average discount, orders using coupons).
 */
public record PromotionStatsResponse(
        long totalPromotions,
        long activePromotions,
        long totalRedemptions,
        double totalDiscountGiven,
        double totalRevenueGenerated,
        double averageDiscount,
        List<TopPromotion> topPromotions
) {
    /** One "most used" entry. */
    public record TopPromotion(
            Long id,
            String code,
            String name,
            int usageCount,
            double totalDiscountGiven,
            double totalRevenueGenerated
    ) {}
}
