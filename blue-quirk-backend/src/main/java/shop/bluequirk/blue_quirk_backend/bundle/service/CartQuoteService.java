package shop.bluequirk.blue_quirk_backend.bundle.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.bundle.dto.CartQuoteRequest;
import shop.bluequirk.blue_quirk_backend.bundle.dto.CartQuoteResponse;
import shop.bluequirk.blue_quirk_backend.entity.Customer;
import shop.bluequirk.blue_quirk_backend.progressive.service.AppliedProgressive;
import shop.bluequirk.blue_quirk_backend.progressive.service.ProgressiveDiscountService;
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
    private final ProgressiveDiscountService progressiveDiscountService;
    private final PromotionRedemptionService redemptionService;
    private final CustomerService customerService;
    private final StoreSettingsService storeSettingsService;

    public CartQuoteService(PricingService pricingService,
                            BundlePricingService bundlePricingService,
                            ProgressiveDiscountService progressiveDiscountService,
                            PromotionRedemptionService redemptionService,
                            CustomerService customerService,
                            StoreSettingsService storeSettingsService) {
        this.pricingService = pricingService;
        this.bundlePricingService = bundlePricingService;
        this.progressiveDiscountService = progressiveDiscountService;
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
        boolean bundleApplied = bundle != null;

        String code = trimToNull(req == null ? null : req.couponCode());
        CustomerRef ref = code != null ? resolveCustomer(req.email()) : null;

        // 2) Automatic progressive multi-item discount, after bundle. First compute it
        //    assuming no coupon is in play so we can price a coupon on the reduced
        //    subtotal; then re-decide once we know whether a valid coupon participates
        //    (the combineWithCoupons policy). This mirrors OrderService exactly.
        AppliedProgressive prog0 = progressiveDiscountService.compute(cart, bundleApplied, false);
        double progDiscount0 = prog0 != null ? prog0.discountAmount() : 0;

        // 3) Coupon (optional) on the subtotal already reduced by bundle + progressive.
        double reduced = round(Math.max(0, subtotal - bundleDiscount - progDiscount0));
        PromotionCalculation calc = code != null
                ? redemptionService.preview(code, reduced, shipping, ref) : null;
        boolean couponValid = calc != null && calc.valid();

        // Re-decide progressive now that coupon participation is known; if suppression
        // changed the reduced subtotal, re-price the coupon so its amount stays correct.
        AppliedProgressive prog = progressiveDiscountService.compute(cart, bundleApplied, couponValid);
        double progDiscount = prog != null ? prog.discountAmount() : 0;
        if (code != null && progDiscount != progDiscount0) {
            reduced = round(Math.max(0, subtotal - bundleDiscount - progDiscount));
            calc = redemptionService.preview(code, reduced, shipping, ref);
            couponValid = calc.valid();
        }

        double couponDiscount = 0;
        String couponMessage = null;
        String couponCode = null;
        if (code != null) {
            couponMessage = calc.message();
            if (couponValid) {
                couponDiscount = calc.discountAmount();
                couponCode = calc.code();
            } else {
                couponCode = code;
            }
        }

        double totalDiscount = round(bundleDiscount + progDiscount + couponDiscount);
        double total = round(Math.max(0, subtotal - totalDiscount + shipping));

        // Upsell hint (only surfaces when no bundle applied yet).
        BundlePricingService.Upsell upsell = bundle == null ? bundlePricingService.upsellFor(cart) : null;

        return new CartQuoteResponse(
                currency(), subtotal, shipping,
                bundleApplied, bundle != null ? bundle.offerId() : null,
                bundle != null ? bundle.label() : null, round(bundleDiscount),
                bundle != null ? bundle.bundledUnits() : 0,
                // progressive block
                prog != null, prog != null && prog.discountAmount() > 0, round(progDiscount),
                prog != null ? prog.eligibleItemCount() : 0,
                prog != null ? prog.discountPerItem() : 0,
                prog != null ? prog.nextDiscount() : 0,
                prog != null ? prog.itemsUntilNext() : 0,
                prog != null ? prog.maxDiscount() : 0,
                prog != null && prog.maxDiscountReached(),
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
