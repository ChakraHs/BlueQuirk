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

    public PricingService(ProductRepository productRepository,
                          StoreSettingsService storeSettingsService) {
        this.productRepository = productRepository;
        this.storeSettingsService = storeSettingsService;
    }

    /** A single client cart line — only the product id and quantity are trusted. */
    public record LineInput(Long productId, int quantity) {}

    /** A priced line: authoritative price × quantity, plus the reloaded product. */
    public record PricedLine(Product product, double unitPrice, int quantity, double lineTotal) {}

    /** The fully priced cart: server-computed subtotal and shipping. */
    public record PricedCart(List<PricedLine> lines, double subtotal, double shippingFee) {}

    /**
     * Prices a cart from the catalog. Throws 400 if the cart is empty or any
     * product no longer exists.
     */
    @Transactional(readOnly = true)
    public PricedCart price(List<LineInput> inputs) {
        if (inputs == null || inputs.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Your cart is empty");
        }

        List<PricedLine> lines = new ArrayList<>(inputs.size());
        double subtotal = 0;
        for (LineInput in : inputs) {
            if (in.productId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order line is missing a product");
            }
            int qty = Math.max(1, in.quantity());
            Product product = productRepository.findById(in.productId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Product " + in.productId() + " no longer exists"));
            double unitPrice = product.getPrice();
            double lineTotal = unitPrice * qty;
            subtotal += lineTotal;
            lines.add(new PricedLine(product, unitPrice, qty, lineTotal));
        }

        return new PricedCart(lines, round(subtotal), computeShipping(subtotal));
    }

    /**
     * Free shipping kicks in once the subtotal reaches the configured threshold
     * (threshold ≤ 0 disables the perk). Mirrors the storefront so totals match.
     */
    public double computeShipping(double subtotal) {
        StoreSettings settings = storeSettingsService.getOrCreate();
        double fee = settings.getShippingFee();
        double threshold = settings.getFreeShippingThreshold();
        return (threshold > 0 && subtotal >= threshold) ? 0.0 : fee;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
