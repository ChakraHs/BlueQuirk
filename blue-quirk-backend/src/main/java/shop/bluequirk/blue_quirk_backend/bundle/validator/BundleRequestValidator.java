package shop.bluequirk.blue_quirk_backend.bundle.validator;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.bundle.domain.BundleEligibility;
import shop.bluequirk.blue_quirk_backend.bundle.domain.BundlePricingMethod;
import shop.bluequirk.blue_quirk_backend.bundle.dto.BundleRequest;

/**
 * Structural validation for bundle create/update payloads — guards that an admin
 * cannot save an incoherent or impossible offer. Runtime pricing is handled by the
 * {@code BundleEngine}. Messages are admin-facing and actionable.
 */
@Component
public class BundleRequestValidator {

    public void validate(BundleRequest req) {
        require(req != null, "Missing bundle body");
        require(notBlank(req.name()), "Offer name is required");

        Integer minQty = req.minQuantity();
        require(minQty != null && minQty >= 2,
                "Minimum quantity must be a whole number of at least 2");

        BundlePricingMethod method = req.pricingMethod();
        require(method != null, "Pricing method is required");

        Double value = req.bundleValue();
        require(value != null && value > 0, "Bundle price / discount value must be greater than zero");
        if (method == BundlePricingMethod.PERCENTAGE_DISCOUNT) {
            require(value <= 100, "Percentage discount cannot exceed 100%");
        }

        BundleEligibility eligibility = req.eligibility();
        require(eligibility != null, "Eligibility is required");
        if (eligibility == BundleEligibility.CATEGORY) {
            require(req.eligibleCategoryIds() != null && !req.eligibleCategoryIds().isEmpty(),
                    "Select at least one collection (category) for a category bundle");
        }
        if (eligibility == BundleEligibility.SELECTED_PRODUCTS) {
            require(req.eligibleProductIds() != null && !req.eligibleProductIds().isEmpty(),
                    "Select at least one product for a product bundle");
        }

        // Mixing off + distinct-products would be contradictory (a same-product-only
        // bundle can never be "distinct products"), so quietly rely on the entity
        // default rather than reject; but a fixed bundle price below zero is invalid.
        if (method == BundlePricingMethod.FIXED_BUNDLE_PRICE) {
            require(value >= 0, "A fixed bundle price cannot be negative");
        }
    }

    private void require(boolean condition, String message) {
        if (!condition) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
