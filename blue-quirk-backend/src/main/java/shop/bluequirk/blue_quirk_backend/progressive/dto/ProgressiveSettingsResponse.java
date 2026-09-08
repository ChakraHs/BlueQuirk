package shop.bluequirk.blue_quirk_backend.progressive.dto;

import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;

import shop.bluequirk.blue_quirk_backend.progressive.entity.ProgressiveDiscountSettings;

/** Full admin view of the progressive-discount config, including analytics + audit. */
public record ProgressiveSettingsResponse(
        boolean enabled,
        double discountPerAdditionalItem,
        double maxDiscount,
        int minItems,
        String countingMethod,
        String eligibility,
        Set<Long> eligibleCategoryIds,
        Set<Long> eligibleProductIds,
        boolean combineWithBundle,
        boolean combineWithCoupons,
        String startsOn,
        String endsOn,
        boolean displayOnProduct,
        boolean displayInCart,
        int version,
        int usageCount,
        double totalDiscountGiven,
        String currency,
        String updatedByEmail,
        String updatedAt
) {
    public static ProgressiveSettingsResponse from(ProgressiveDiscountSettings s, String currency) {
        return new ProgressiveSettingsResponse(
                s.isEnabled(),
                s.getDiscountPerAdditionalItem(),
                s.getMaxDiscount(),
                s.getMinItems(),
                s.getCountingMethod() != null ? s.getCountingMethod().name() : null,
                s.getEligibility() != null ? s.getEligibility().name() : null,
                new HashSet<>(s.getEligibleCategoryIds() != null ? s.getEligibleCategoryIds() : Set.of()),
                new HashSet<>(s.getEligibleProductIds() != null ? s.getEligibleProductIds() : Set.of()),
                s.isCombineWithBundle(),
                s.isCombineWithCoupons(),
                s.getStartsOn() != null ? s.getStartsOn().format(DateTimeFormatter.ISO_LOCAL_DATE) : null,
                s.getEndsOn() != null ? s.getEndsOn().format(DateTimeFormatter.ISO_LOCAL_DATE) : null,
                s.isDisplayOnProduct(),
                s.isDisplayInCart(),
                s.getVersion(),
                s.getUsageCount(),
                s.getTotalDiscountGiven(),
                currency,
                s.getUpdatedByEmail(),
                s.getUpdatedAt() != null ? s.getUpdatedAt().toString() : null);
    }
}
