package shop.bluequirk.blue_quirk_backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public, non-secret storefront configuration. Exposes the shipping economics
 * (flat fee + free-shipping threshold) so the frontend can render the free
 * shipping progress bar / banners without hardcoding the numbers — the backend
 * stays the single source of truth (it also computes the actual order totals).
 */
@RestController
@RequestMapping("/api/shop")
public class ShopConfigController {

    private final double shippingFee;
    private final double freeShippingThreshold;
    private final String currency;

    public ShopConfigController(
            @Value("${order.shipping-fee:0}") double shippingFee,
            @Value("${order.free-shipping-threshold:0}") double freeShippingThreshold,
            @Value("${order.currency:DH}") String currency) {
        this.shippingFee = shippingFee;
        this.freeShippingThreshold = freeShippingThreshold;
        this.currency = currency;
    }

    @GetMapping("/config")
    public ShopConfig getConfig() {
        return new ShopConfig(currency, shippingFee, freeShippingThreshold);
    }

    public record ShopConfig(String currency, double shippingFee, double freeShippingThreshold) {}
}
