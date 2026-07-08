package shop.bluequirk.blue_quirk_backend.promotion.mapper;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;

import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.dto.PromotionResponse;
import shop.bluequirk.blue_quirk_backend.promotion.dto.PromotionSummary;
import shop.bluequirk.blue_quirk_backend.promotion.entity.Promotion;

/** Entity → DTO conversions for promotions. No entities/lazy relations leak out. */
public final class PromotionMapper {

    private PromotionMapper() {}

    public static PromotionSummary toSummary(Promotion p) {
        return new PromotionSummary(
                p.getId(),
                p.getName(),
                p.getCode(),
                p.getDiscountType(),
                p.getDiscountValue(),
                discountLabel(p),
                p.isActive(),
                p.getLifecycleStatus().name(),
                p.getUsageCount(),
                p.getMaxGlobalUsage(),
                p.getMaxUsagePerCustomer(),
                fmt(p.getStartDate()),
                fmt(p.getEndDate()),
                p.getMinOrderAmount(),
                p.getTotalDiscountGiven(),
                p.getTotalRevenueGenerated(),
                p.getCreatedByEmail(),
                fmt(p.getCreatedAt()));
    }

    public static PromotionResponse toResponse(Promotion p) {
        Integer remaining = p.getMaxGlobalUsage() == null
                ? null
                : Math.max(0, p.getMaxGlobalUsage() - p.getUsageCount());

        return new PromotionResponse(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getCode(),
                p.isActive(),
                p.getLifecycleStatus().name(),
                p.getDiscountType(),
                p.getDiscountValue(),
                discountLabel(p),
                fmt(p.getStartDate()),
                fmt(p.getEndDate()),
                p.getMaxGlobalUsage() == null,
                p.getMaxGlobalUsage(),
                p.getMaxUsagePerCustomer(),
                remaining,
                p.getMinOrderAmount(),
                p.getMaxDiscountAmount(),
                p.getCustomerEligibility(),
                new HashSet<>(p.getEligibleCustomerIds()),
                p.isFreeShipping(),
                p.getScope(),
                new HashSet<>(p.getRestrictedCategoryIds()),
                new HashSet<>(p.getRestrictedProductIds()),
                new HashSet<>(p.getRestrictedBrandIds()),
                p.getUsageCount(),
                p.getTotalDiscountGiven(),
                p.getTotalRevenueGenerated(),
                fmt(p.getLastUsedAt()),
                p.getCreatedBy(),
                p.getCreatedByEmail(),
                p.getUpdatedBy(),
                p.getUpdatedByEmail(),
                fmt(p.getCreatedAt()),
                fmt(p.getUpdatedAt()));
    }

    /** Human label for the discount column, e.g. "20%" or "50.00 DH". */
    public static String discountLabel(Promotion p) {
        DiscountType type = p.getDiscountType();
        double v = p.getDiscountValue();
        return switch (type) {
            case PERCENTAGE -> trimNumber(v) + "%";
            case FIXED_AMOUNT -> String.format("%.2f DH", v);
            case FREE_SHIPPING -> "Free shipping";
            case BUY_X_GET_Y -> "Buy X get Y";
        };
    }

    private static String trimNumber(double v) {
        if (v == Math.floor(v)) return String.valueOf((long) v);
        return String.valueOf(v);
    }

    private static String fmt(LocalDateTime dt) {
        return dt == null ? null : dt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    private static String fmt(Instant instant) {
        return instant == null ? null : instant.toString();
    }
}
