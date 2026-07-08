package shop.bluequirk.blue_quirk_backend.promotion.dto;

import java.time.LocalDateTime;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonFormat;

import shop.bluequirk.blue_quirk_backend.promotion.domain.CustomerEligibility;
import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.domain.PromotionScope;

/**
 * Create/update payload for a promotion (admin). Nullable boxed types let a
 * partial update leave fields at their defaults. Server-managed fields (usage
 * counters, audit, id) are never accepted here. {@code code} may be blank on
 * create to request an auto-generated code.
 */
public record PromotionRequest(
        String name,
        String description,
        String code,
        Boolean active,

        DiscountType discountType,
        Double discountValue,

        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm[:ss]") LocalDateTime startDate,
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm[:ss]") LocalDateTime endDate,

        /** When true, any provided maxGlobalUsage is ignored (unlimited). */
        Boolean unlimitedUsage,
        Integer maxGlobalUsage,
        Integer maxUsagePerCustomer,

        Double minOrderAmount,
        Double maxDiscountAmount,

        CustomerEligibility customerEligibility,
        Set<Long> eligibleCustomerIds,

        // --- Future-ready (persisted but not yet applied by the engine) ---
        Boolean freeShipping,
        PromotionScope scope,
        Set<Long> restrictedCategoryIds,
        Set<Long> restrictedProductIds,
        Set<Long> restrictedBrandIds
) {}
