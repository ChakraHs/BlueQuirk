package shop.bluequirk.blue_quirk_backend.promotion.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.promotion.dto.CouponValidationRequest;
import shop.bluequirk.blue_quirk_backend.promotion.dto.CouponValidationResponse;
import shop.bluequirk.blue_quirk_backend.promotion.service.CouponService;

/**
 * Public storefront coupon endpoint. Like guest checkout, it is open to
 * unauthenticated visitors (see SecurityConfig). It only previews a discount —
 * it never mutates usage — and always reprices the cart server-side, so it is
 * safe to expose.
 */
@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    private final CouponService couponService;

    public CouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    /** Validate a coupon against a cart and return the server-computed breakdown. */
    @PostMapping("/validate")
    public ResponseEntity<CouponValidationResponse> validate(
            @RequestBody CouponValidationRequest request) {
        return ResponseEntity.ok(couponService.validate(request));
    }
}
