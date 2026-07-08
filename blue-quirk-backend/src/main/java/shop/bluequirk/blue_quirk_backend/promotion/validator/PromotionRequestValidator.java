package shop.bluequirk.blue_quirk_backend.promotion.validator;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.promotion.domain.CustomerEligibility;
import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.dto.PromotionRequest;

/**
 * Structural validation for promotion create/update payloads. Business/runtime
 * validation of a coupon at redemption lives in the {@code PromotionEngine};
 * this only guards that an admin cannot save an incoherent definition.
 */
@Component
public class PromotionRequestValidator {

    public void validateForCreate(PromotionRequest req) {
        validateCommon(req);
    }

    public void validateForUpdate(PromotionRequest req) {
        validateCommon(req);
    }

    private void validateCommon(PromotionRequest req) {
        require(req != null, "Missing promotion body");
        require(notBlank(req.name()), "Promotion name is required");

        DiscountType type = req.discountType();
        require(type != null, "Discount type is required");

        Double value = req.discountValue();
        require(value != null && value > 0, "Discount value must be greater than zero");
        if (type == DiscountType.PERCENTAGE) {
            require(value <= 100, "Percentage discount cannot exceed 100%");
        }

        if (req.startDate() != null && req.endDate() != null) {
            require(!req.endDate().isBefore(req.startDate()), "End date must be after the start date");
        }

        boolean unlimited = Boolean.TRUE.equals(req.unlimitedUsage());
        if (!unlimited && req.maxGlobalUsage() != null) {
            require(req.maxGlobalUsage() > 0, "Maximum global usage must be greater than zero");
        }
        if (req.maxUsagePerCustomer() != null) {
            require(req.maxUsagePerCustomer() > 0, "Maximum usage per customer must be greater than zero");
        }
        if (req.minOrderAmount() != null) {
            require(req.minOrderAmount() >= 0, "Minimum order amount cannot be negative");
        }
        if (req.maxDiscountAmount() != null) {
            require(req.maxDiscountAmount() > 0, "Maximum discount amount must be greater than zero");
        }

        if (req.customerEligibility() == CustomerEligibility.SELECTED_CUSTOMERS) {
            require(req.eligibleCustomerIds() != null && !req.eligibleCustomerIds().isEmpty(),
                    "Select at least one customer for a customer-restricted promotion");
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
