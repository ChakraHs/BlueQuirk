package shop.bluequirk.blue_quirk_backend.bundle.dto;

import java.util.List;

import shop.bluequirk.blue_quirk_backend.bundle.domain.BundleEligibility;
import shop.bluequirk.blue_quirk_backend.bundle.domain.BundlePricingMethod;

/** Full admin view of a bundle offer (list + detail). */
public record BundleResponse(
        Long id,
        String name,
        String description,
        boolean active,
        int minQuantity,
        BundlePricingMethod pricingMethod,
        double bundleValue,
        // Human-readable summary of the offer, e.g. "Buy 2 → 349.00 DH".
        String pricingLabel,
        BundleEligibility eligibility,
        List<Long> eligibleCategoryIds,
        List<Long> eligibleProductIds,
        boolean allowMixing,
        boolean allowSameProduct,
        boolean displayOnProduct,
        boolean displayInCart,
        int priority,
        int usageCount,
        double totalDiscountGiven,
        String createdByEmail,
        String updatedByEmail,
        String createdAt,
        String updatedAt
) {}
