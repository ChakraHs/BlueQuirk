package shop.bluequirk.blue_quirk_backend.bundle.dto;

import java.util.List;

import shop.bluequirk.blue_quirk_backend.bundle.domain.BundleEligibility;
import shop.bluequirk.blue_quirk_backend.bundle.domain.BundlePricingMethod;

/**
 * Admin create/update payload for a bundle offer. Structural validation lives in
 * {@code BundleRequestValidator}; nullable boxed types let the service apply
 * sensible defaults when a field is omitted.
 */
public record BundleRequest(
        String name,
        String description,
        Boolean active,
        Integer minQuantity,
        BundlePricingMethod pricingMethod,
        Double bundleValue,
        BundleEligibility eligibility,
        List<Long> eligibleCategoryIds,
        List<Long> eligibleProductIds,
        Boolean allowMixing,
        Boolean allowSameProduct,
        Boolean displayOnProduct,
        Boolean displayInCart,
        Integer priority
) {}
