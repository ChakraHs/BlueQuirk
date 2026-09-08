package shop.bluequirk.blue_quirk_backend.bundle.dto;

import java.util.List;

import shop.bluequirk.blue_quirk_backend.bundle.domain.BundleEligibility;
import shop.bluequirk.blue_quirk_backend.bundle.domain.BundlePricingMethod;

/**
 * Storefront-safe view of an active bundle offer. Carries only what the product
 * page / cart need to <b>display</b> the offer and let the customer build a set —
 * the eligible scope (so the page knows if this product qualifies) and the pricing
 * parameters (so it can show "2 for 349, save X"). None of this is secret; the
 * authoritative discount is always recomputed by the backend at quote/checkout.
 */
public record BundleOfferPublic(
        Long id,
        String name,
        int minQuantity,
        BundlePricingMethod pricingMethod,
        double bundleValue,
        BundleEligibility eligibility,
        List<Long> eligibleCategoryIds,
        List<Long> eligibleProductIds,
        boolean allowMixing,
        boolean allowSameProduct,
        boolean displayOnProduct,
        boolean displayInCart
) {}
