package shop.bluequirk.blue_quirk_backend.bundle.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.bundle.dto.CartQuoteRequest;
import shop.bluequirk.blue_quirk_backend.bundle.dto.CartQuoteResponse;
import shop.bluequirk.blue_quirk_backend.bundle.service.CartQuoteService;

/**
 * Public cart-pricing endpoint. Prices a cart authoritatively (catalog prices +
 * automatic bundle + optional coupon) so the cart and checkout render totals that
 * exactly match what the order will charge. Read-only; open like the guest
 * checkout and the coupon-preview endpoint (never mutates usage or stock).
 */
@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartQuoteService cartQuoteService;

    public CartController(CartQuoteService cartQuoteService) {
        this.cartQuoteService = cartQuoteService;
    }

    @PostMapping("/quote")
    public CartQuoteResponse quote(@RequestBody CartQuoteRequest request) {
        return cartQuoteService.quote(request);
    }
}
