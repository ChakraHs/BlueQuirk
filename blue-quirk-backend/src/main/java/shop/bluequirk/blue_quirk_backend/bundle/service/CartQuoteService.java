package shop.bluequirk.blue_quirk_backend.bundle.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.bundle.dto.CartQuoteRequest;
import shop.bluequirk.blue_quirk_backend.bundle.dto.CartQuoteResponse;
import shop.bluequirk.blue_quirk_backend.entity.Customer;
import shop.bluequirk.blue_quirk_backend.promotion.engine.PromotionCalculation;
import shop.bluequirk.blue_quirk_backend.promotion.service.PromotionRedemptionService;
import shop.bluequirk.blue_quirk_backend.promotion.service.PromotionRedemptionService.CustomerRef;
import shop.bluequirk.blue_quirk_backend.service.CustomerService;
import shop.bluequirk.blue_quirk_backend.service.PricingService;
import shop.bluequirk.blue_quirk_backend.service.PricingService.LineInput;
import shop.bluequirk.blue_quirk_backend.service.PricingService.PricedCart;
import shop.bluequirk.blue_quirk_backend.service.StoreSettingsService;

/**
 * The single authoritative cart-pricing endpoint backing the storefront cart and
 * checkout display. It composes exactly the same building blocks as order
 * creation — {@link PricingService} (catalog prices), {@link BundlePricingService}
 * (automatic bundle) and the coupon engine — in the same order, so the numbers a
 * customer sees before paying always equal what the order will charge.
 *
 * <p>Discount order (documented policy): bundle first on the subtotal, then a
 * coupon (if valid) on the already-reduced subtotal. Read-only — nothing is
 * claimed or persisted here.
 */
@Service
public class CartQuoteService {

    private final PricingService pricingService;
    private final BundlePricingService bundlePricingService;
    private final PromotionRedemptionService redemptionService;
    private final CustomerService customerService;
    private final StoreSettingsService storeSettingsService;

    public CartQuoteService(PricingService pricingService,
                            BundlePricingService bundlePricingService,
                            PromotionRedemptionService redemptionService,
                            CustomerService customerService,
                            StoreSettingsService storeSettingsService) {
        this.pricingService = pricingService;
        this.bundlePricingService = bundlePricingService;
        this.redemptionService = redemptionService;
        this.customerService = customerService;
        this.storeSettingsService = storeSettingsService;
    }

    @Transactional(readOnly = true)
    public CartQuoteResponse quote(CartQuoteRequest req) {
        List<LineInput> lines = (req == null || req.items() == null) ? List.of()
                : req.items().stream().map(i -> new LineInput(i.productId(), i.quantity())).toList();

        PricedCart cart = pricingService.price(lines);
        double subtotal = cart.subtotal();
        double shipping = cart.shippingFee();

        // 1) Automatic bundle discount on the goods subtotal.
        AppliedBundle bundle = bundlePricingService.bestFor(cart);
        double bundleDiscount = bundle != null ? bundle.discountAmount() : 0;

        // 2) Coupon (optional) on the already-reduced subtotal.
        double reduced = round(Math.max(0, subtotal - bundleDiscount));
        double couponDiscount = 0;
        boolean couponValid = false;
        String couponMessage = null;
        String couponCode = null;
        String code = trimToNull(req == null ? null : req.couponCode());
        if (code != null) {
            CustomerRef ref = resolveCustomer(req.email());
            PromotionCalculation calc = redemptionService.preview(code, reduced, shipping, ref);
            couponValid = calc.valid();
            couponMessage = calc.message();
            if (couponValid) {
                couponDiscount = calc.discountAmount();
                couponCode = calc.code();
            } else {
                couponCode = code;
            }
        }

        double totalDiscount = round(bundleDiscount + couponDiscount);
        double total = round(Math.max(0, subtotal - totalDiscount + shipping));

        // Upsell hint (only surfaces when no bundle applied yet).
        BundlePricingService.Upsell upsell = bundle == null ? bundlePricingService.upsellFor(cart) : null;

        return new CartQuoteResponse(
                currency(), subtotal, shipping,
                bundle != null, bundle != null ? bundle.offerId() : null,
                bundle != null ? bundle.label() : null, round(bundleDiscount),
                bundle != null ? bundle.bundledUnits() : 0,
                couponCode, couponValid, couponMessage, round(couponDiscount),
                upsell != null, upsell != null ? upsell.label() : null,
                upsell != null ? upsell.minQuantity() : 0,
                upsell != null ? upsell.unitsNeeded() : 0,
                upsell != null ? upsell.setPrice() : 0,
                totalDiscount, total);
    }

    private CustomerRef resolveCustomer(String email) {
        if (email == null || email.isBlank()) {
            return new CustomerRef(null, null, null, true);
        }
        Long customerId = customerService.findByEmail(email).map(Customer::getId).orElse(null);
        boolean firstOrder = customerService.isFirstOrderForEmail(email);
        return new CustomerRef(customerId, null, email, firstOrder);
    }

    private String currency() {
        try {
            return storeSettingsService.getOrCreate().getCurrency();
        } catch (Exception e) {
            return "DH";
        }
    }

    private String trimToNull(String s) {
        return (s != null && !s.isBlank()) ? s.trim() : null;
    }

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
