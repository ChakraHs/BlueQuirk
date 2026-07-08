package shop.bluequirk.blue_quirk_backend.promotion.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.entity.Customer;
import shop.bluequirk.blue_quirk_backend.promotion.dto.CouponValidationRequest;
import shop.bluequirk.blue_quirk_backend.promotion.dto.CouponValidationResponse;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PromotionCalculation;
import shop.bluequirk.blue_quirk_backend.promotion.service.PromotionRedemptionService.CustomerRef;
import shop.bluequirk.blue_quirk_backend.service.CustomerService;
import shop.bluequirk.blue_quirk_backend.service.PricingService;
import shop.bluequirk.blue_quirk_backend.service.PricingService.LineInput;
import shop.bluequirk.blue_quirk_backend.service.PricingService.PricedCart;

/**
 * Storefront coupon preview. Prices the cart from the catalog (never trusting
 * client prices), resolves the customer context from the optional email, and
 * asks the engine to evaluate — returning the server-computed money breakdown
 * the checkout renders verbatim. Read-only: nothing is claimed or recorded here.
 */
@Service
public class CouponService {

    private final PricingService pricingService;
    private final CustomerService customerService;
    private final PromotionRedemptionService redemptionService;

    public CouponService(PricingService pricingService,
                         CustomerService customerService,
                         PromotionRedemptionService redemptionService) {
        this.pricingService = pricingService;
        this.customerService = customerService;
        this.redemptionService = redemptionService;
    }

    @Transactional(readOnly = true)
    public CouponValidationResponse validate(CouponValidationRequest req) {
        List<LineInput> lines = req.items() == null ? List.of() : req.items().stream()
                .map(i -> new LineInput(i.productId(), i.quantity()))
                .toList();
        PricedCart cart = pricingService.price(lines);

        CustomerRef ref = resolveCustomer(req.email());
        PromotionCalculation calc = redemptionService.preview(
                req.code(), cart.subtotal(), cart.shippingFee(), ref);

        return CouponValidationResponse.from(calc, cart.subtotal(), cart.shippingFee());
    }

    /** Builds the customer context for coupon rules from an optional email. */
    private CustomerRef resolveCustomer(String email) {
        if (email == null || email.isBlank()) {
            return new CustomerRef(null, null, null, true);
        }
        Long customerId = customerService.findByEmail(email).map(Customer::getId).orElse(null);
        boolean firstOrder = customerService.isFirstOrderForEmail(email);
        return new CustomerRef(customerId, null, email, firstOrder);
    }
}
