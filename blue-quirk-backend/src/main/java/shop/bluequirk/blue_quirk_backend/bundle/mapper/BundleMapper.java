package shop.bluequirk.blue_quirk_backend.bundle.mapper;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;

import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.bundle.domain.BundlePricingMethod;
import shop.bluequirk.blue_quirk_backend.bundle.dto.BundleOfferPublic;
import shop.bluequirk.blue_quirk_backend.bundle.dto.BundleResponse;
import shop.bluequirk.blue_quirk_backend.bundle.entity.BundleOffer;

/** Maps {@link BundleOffer} entities to their admin and storefront DTOs. */
@Component
public class BundleMapper {

    public BundleResponse toResponse(BundleOffer o, String currency) {
        return new BundleResponse(
                o.getId(),
                o.getName(),
                o.getDescription(),
                o.isActive(),
                o.getMinQuantity(),
                o.getPricingMethod(),
                o.getBundleValue(),
                pricingLabel(o, currency),
                o.getEligibility(),
                new ArrayList<>(o.getEligibleCategoryIds()),
                new ArrayList<>(o.getEligibleProductIds()),
                o.isAllowMixing(),
                o.isAllowSameProduct(),
                o.isDisplayOnProduct(),
                o.isDisplayInCart(),
                o.getPriority(),
                o.getUsageCount(),
                o.getTotalDiscountGiven(),
                o.getCreatedByEmail(),
                o.getUpdatedByEmail(),
                o.getCreatedAt() != null ? DateTimeFormatter.ISO_INSTANT.format(o.getCreatedAt()) : null,
                o.getUpdatedAt() != null ? DateTimeFormatter.ISO_INSTANT.format(o.getUpdatedAt()) : null);
    }

    public BundleOfferPublic toPublic(BundleOffer o) {
        return new BundleOfferPublic(
                o.getId(),
                o.getName(),
                o.getMinQuantity(),
                o.getPricingMethod(),
                o.getBundleValue(),
                o.getEligibility(),
                new ArrayList<>(o.getEligibleCategoryIds()),
                new ArrayList<>(o.getEligibleProductIds()),
                o.isAllowMixing(),
                o.isAllowSameProduct(),
                o.isDisplayOnProduct(),
                o.isDisplayInCart());
    }

    /** e.g. "Buy 2 → 349.00 DH", "Buy 2 → 10% off", "Buy 2 → 30.00 DH off". */
    public String pricingLabel(BundleOffer o, String currency) {
        String cur = currency == null || currency.isBlank() ? "DH" : currency;
        String buy = "Buy " + o.getMinQuantity() + " → ";
        double v = o.getBundleValue();
        BundlePricingMethod m = o.getPricingMethod();
        if (m == BundlePricingMethod.FIXED_BUNDLE_PRICE) {
            return buy + String.format("%.2f %s", v, cur);
        } else if (m == BundlePricingMethod.PERCENTAGE_DISCOUNT) {
            return buy + String.format("%.0f%% off", v);
        }
        return buy + String.format("%.2f %s off", v, cur);
    }
}
