package shop.bluequirk.blue_quirk_backend.progressive.dto;

import java.util.Set;

/**
 * Admin update payload for the progressive multi-item discount. All fields are the
 * full desired state (this is a singleton config, not a partial patch). Enums arrive
 * as their string names; unknown/blank values fall back to safe defaults in the
 * service.
 */
public record ProgressiveSettingsRequest(
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
        boolean displayInCart
) {}
