package shop.bluequirk.blue_quirk_backend.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.entity.StoreSettings;
import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;

/**
 * Single source of truth for cart pricing. Reloads every product from the
 * catalog and computes the subtotal and shipping from authoritative data — the
 * client's prices/totals are never consulted. Shared by checkout (order
 * creation) and the coupon-preview endpoint so both price a cart identically.
 */
@Service
public class PricingService {

    private final ProductRepository productRepository;
    private final StoreSettingsService storeSettingsService;
    private final CampaignPricing campaignPricing;
    private final CityService cityService;

    public PricingService(ProductRepository productRepository,
                          StoreSettingsService storeSettingsService,
                          CampaignPricing campaignPricing,
                          CityService cityService) {
        this.productRepository = productRepository;
        this.storeSettingsService = storeSettingsService;
        this.campaignPricing = campaignPricing;
        this.cityService = cityService;
    }

    /** A single client cart line — only the product id and quantity are trusted. */
    public record LineInput(Long productId, int quantity) {}

    /** A priced line: authoritative price × quantity, plus the reloaded product. */
    public record PricedLine(Product product, double unitPrice, int quantity, double lineTotal) {}

    /** The fully priced cart: server-computed subtotal and shipping. */
    public record PricedCart(List<PricedLine> lines, double subtotal, double shippingFee) {}

    /** Prices a cart with the flat (default) shipping — no city context. */
    @Transactional(readOnly = true)
    public PricedCart price(List<LineInput> inputs) {
        return price(inputs, null);
    }

    /**
     * Prices a cart from the catalog, resolving shipping for the given delivery
     * {@code city} (its per-city fee when listed, else the flat settings fee).
     * Throws 400 if the cart is empty or any product no longer exists.
     */
    @Transactional(readOnly = true)
    public PricedCart price(List<LineInput> inputs, String city) {
        if (inputs == null || inputs.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Your cart is empty");
        }

        List<PricedLine> lines = new ArrayList<>(inputs.size());
        double subtotal = 0;
        int totalQuantity = 0;
        for (LineInput in : inputs) {
            if (in.productId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order line is missing a product");
            }
            int qty = Math.max(1, in.quantity());
            Product product = productRepository.findById(in.productId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Product " + in.productId() + " no longer exists"));
            // Charge the campaign selling price (base + surcharge) so what the
            // customer is billed matches what the storefront displayed.
            double unitPrice = campaignPricing.sellingPrice(product.getPrice());
            double lineTotal = unitPrice * qty;
            subtotal += lineTotal;
            totalQuantity += qty;
            lines.add(new PricedLine(product, unitPrice, qty, lineTotal));
        }

        return new PricedCart(lines, round(subtotal), computeShipping(subtotal, totalQuantity, city));
    }

    /**
     * The customer shipping price for a subtotal + total item quantity + delivery
     * city. The per-city fee (or the flat settings fee when the city isn't listed)
     * is the base. Free shipping is waived by whichever rule the admin has active:
     * when the quantity mode is enabled, once the cart holds at least the configured
     * number of products; otherwise once the subtotal reaches the configured
     * threshold (a threshold/quantity of ≤ 0 disables that perk). Mirrors the
     * storefront so displayed and charged totals match.
     */
    public double computeShipping(double subtotal, int totalQuantity, String city) {
        // Per-city customer fee, falling back to the settings default for unlisted
        // cities. A fee of 0 means free everywhere; the active perk still waives a
        // non-zero fee once the cart qualifies.
        double fee = cityService.customerShippingFee(city);
        StoreSettings s = storeSettingsService.getOrCreate();
        if (s.isFreeShippingByQuantityEnabled()) {
            int required = s.getFreeShippingQuantity();
            return (required > 0 && totalQuantity >= required) ? 0.0 : fee;
        }
        double threshold = s.getFreeShippingThreshold();
        return (threshold > 0 && subtotal >= threshold) ? 0.0 : fee;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
