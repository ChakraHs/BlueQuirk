package shop.bluequirk.blue_quirk_backend.progressive.dto;

import java.util.HashSet;
import java.util.Set;

import shop.bluequirk.blue_quirk_backend.progressive.entity.ProgressiveDiscountSettings;

/**
 * Storefront-safe view of the active progressive discount: only the non-secret
 * display parameters product pages / cards need to render "add one more and save"
 * incentives. The backend stays the single source of truth — the actual discount is
 * always recomputed at {@code POST /api/cart/quote} and at checkout. This endpoint is
 * display-only, and is only ever emitted when the mechanism is enabled and in-window.
 */
public record ProgressivePublicConfig(
        boolean enabled,
        double discountPerAdditionalItem,
        double maxDiscount,
        int minItems,
        String countingMethod,
        String eligibility,
        Set<Long> eligibleCategoryIds,
        Set<Long> eligibleProductIds,
        boolean displayOnProduct,
        boolean displayInCart,
        String currency
) {
    /** The "off" config the public endpoint returns when nothing is active. */
    public static ProgressivePublicConfig disabled(String currency) {
        return new ProgressivePublicConfig(false, 0, 0, 0, "UNIQUE_PRODUCTS", "ALL_PRODUCTS",
                Set.of(), Set.of(), false, false, currency);
    }

    public static ProgressivePublicConfig from(ProgressiveDiscountSettings s, String currency) {
        return new ProgressivePublicConfig(
                true,
                s.getDiscountPerAdditionalItem(),
                s.getMaxDiscount(),
                s.getMinItems(),
                s.getCountingMethod() != null ? s.getCountingMethod().name() : "UNIQUE_PRODUCTS",
                s.getEligibility() != null ? s.getEligibility().name() : "ALL_PRODUCTS",
                new HashSet<>(s.getEligibleCategoryIds() != null ? s.getEligibleCategoryIds() : Set.of()),
                new HashSet<>(s.getEligibleProductIds() != null ? s.getEligibleProductIds() : Set.of()),
                s.isDisplayOnProduct(),
                s.isDisplayInCart(),
                currency);
    }
}
