package shop.bluequirk.blue_quirk_backend.promotion.dto;

import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;

/**
 * Lean row for the admin list (no lazy collections, so listing many promotions
 * stays a single query). Carries everything the table columns and status badge
 * need, plus the per-row statistics.
 */
public record PromotionSummary(
        Long id,
        String name,
        String code,
        DiscountType discountType,
        double discountValue,
        String discountLabel,
        boolean active,
        String status,
        int usageCount,
        Integer maxGlobalUsage,
        Integer maxUsagePerCustomer,
        String startDate,
        String endDate,
        Double minOrderAmount,
        double totalDiscountGiven,
        double totalRevenueGenerated,
        String createdByEmail,
        String createdAt
) {}
