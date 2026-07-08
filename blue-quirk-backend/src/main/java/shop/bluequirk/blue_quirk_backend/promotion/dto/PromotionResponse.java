package shop.bluequirk.blue_quirk_backend.promotion.dto;

import java.util.Set;

import shop.bluequirk.blue_quirk_backend.promotion.domain.CustomerEligibility;
import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.domain.PromotionScope;

/** Full promotion view for the admin detail/edit screen. */
public record PromotionResponse(
        Long id,
        String name,
        String description,
        String code,
        boolean active,
        String status,

        DiscountType discountType,
        double discountValue,
        String discountLabel,

        String startDate,
        String endDate,

        boolean unlimitedUsage,
        Integer maxGlobalUsage,
        Integer maxUsagePerCustomer,
        Integer remainingUsage,

        Double minOrderAmount,
        Double maxDiscountAmount,

        CustomerEligibility customerEligibility,
        Set<Long> eligibleCustomerIds,

        boolean freeShipping,
        PromotionScope scope,
        Set<Long> restrictedCategoryIds,
        Set<Long> restrictedProductIds,
        Set<Long> restrictedBrandIds,

        // --- Analytics + audit ---
        int usageCount,
        double totalDiscountGiven,
        double totalRevenueGenerated,
        String lastUsedAt,
        Long createdBy,
        String createdByEmail,
        Long updatedBy,
        String updatedByEmail,
        String createdAt,
        String updatedAt
) {}
