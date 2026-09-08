package shop.bluequirk.blue_quirk_backend.progressive.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.entity.Category;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.progressive.domain.ProgressiveCountingMethod;
import shop.bluequirk.blue_quirk_backend.progressive.domain.ProgressiveEligibility;
import shop.bluequirk.blue_quirk_backend.progressive.dto.ProgressivePublicConfig;
import shop.bluequirk.blue_quirk_backend.progressive.dto.ProgressiveSettingsRequest;
import shop.bluequirk.blue_quirk_backend.progressive.dto.ProgressiveSettingsResponse;
import shop.bluequirk.blue_quirk_backend.progressive.engine.ProgressiveCalculation;
import shop.bluequirk.blue_quirk_backend.progressive.engine.ProgressiveDiscountEngine;
import shop.bluequirk.blue_quirk_backend.progressive.entity.ProgressiveDiscountSettings;
import shop.bluequirk.blue_quirk_backend.progressive.repository.ProgressiveDiscountSettingsRepository;
import shop.bluequirk.blue_quirk_backend.service.PricingService.PricedCart;
import shop.bluequirk.blue_quirk_backend.service.PricingService.PricedLine;
import shop.bluequirk.blue_quirk_backend.service.StoreSettingsService;

/**
 * Resolves the authoritative progressive multi-item discount for a priced cart.
 * Single source of truth — used identically by the storefront quote endpoint
 * (display) and by checkout (the amount actually charged), so the two can never
 * drift. The client's prices are never consulted; it only ever sees a
 * {@link PricedCart} built from the catalog.
 *
 * <p>Stacking policy (spec §16, admin-configurable): the discount is computed
 * <b>after</b> any automatic bundle and <b>before</b> a coupon. The caller passes
 * whether a bundle / coupon is in play, and this service honours the
 * {@code combineWithBundle} / {@code combineWithCoupons} flags — guaranteeing there
 * is never a double-discount the admin did not opt into.
 */
@Service
public class ProgressiveDiscountService {

    private final ProgressiveDiscountSettingsRepository repository;
    private final ProgressiveDiscountEngine engine;
    private final StoreSettingsService storeSettingsService;

    public ProgressiveDiscountService(ProgressiveDiscountSettingsRepository repository,
                                      ProgressiveDiscountEngine engine,
                                      StoreSettingsService storeSettingsService) {
        this.repository = repository;
        this.engine = engine;
        this.storeSettingsService = storeSettingsService;
    }

    /** The singleton config row, created (disabled) on first access. */
    @Transactional
    public ProgressiveDiscountSettings getOrCreate() {
        return repository.findById(ProgressiveDiscountSettings.SINGLETON_ID)
                .orElseGet(() -> {
                    ProgressiveDiscountSettings fresh = new ProgressiveDiscountSettings();
                    fresh.setId(ProgressiveDiscountSettings.SINGLETON_ID);
                    return repository.save(fresh);
                });
    }

    /** Read-only fetch of the singleton, tolerating an early/absent table. */
    @Transactional(readOnly = true)
    public ProgressiveDiscountSettings peek() {
        try {
            return repository.findById(ProgressiveDiscountSettings.SINGLETON_ID).orElse(null);
        } catch (RuntimeException e) {
            return null;
        }
    }

    /**
     * The config when it is enabled AND inside its optional campaign window, else
     * {@code null}. Used by the public storefront config endpoint and as the gate for
     * pricing.
     */
    @Transactional(readOnly = true)
    public ProgressiveDiscountSettings activeConfig() {
        ProgressiveDiscountSettings s = peek();
        if (s == null || !s.isEnabled()) return null;
        LocalDate today = LocalDate.now();
        if (s.getStartsOn() != null && today.isBefore(s.getStartsOn())) return null;
        if (s.getEndsOn() != null && today.isAfter(s.getEndsOn())) return null;
        return s;
    }

    /**
     * Computes the progressive discount for a priced cart, honouring the stacking
     * flags. Returns {@code null} when the mechanism is off, out of window, suppressed
     * by the stacking policy, or the cart has no eligible items. A non-null result
     * with {@code discountAmount == 0} means the cart has eligible items but has not
     * yet crossed the activation gate — callers use its metadata to nudge the customer.
     *
     * @param bundleApplied whether an automatic bundle discount applied to this cart
     * @param couponInPlay  whether a (valid) coupon is participating in this cart
     */
    @Transactional(readOnly = true)
    public AppliedProgressive compute(PricedCart cart, boolean bundleApplied, boolean couponInPlay) {
        ProgressiveDiscountSettings s = activeConfig();
        if (s == null) return null;
        if (bundleApplied && !s.isCombineWithBundle()) return null;
        if (couponInPlay && !s.isCombineWithCoupons()) return null;
        if (cart == null || cart.lines() == null || cart.lines().isEmpty()) return null;

        int count = countEligible(s, cart);
        if (count <= 0) return null; // nothing eligible in this cart — stay silent

        ProgressiveCalculation calc = engine.evaluate(
                count, s.getMinItems(), s.getDiscountPerAdditionalItem(), s.getMaxDiscount());

        return new AppliedProgressive(
                calc.currentDiscount(), calc.eligibleItemCount(), calc.discountPerItem(),
                calc.nextDiscount(), calc.itemsUntilNext(), calc.maxDiscount(),
                calc.maxDiscountReached(), s.getVersion());
    }

    /** Eligible-item count for the cart under the configured counting method. */
    private int countEligible(ProgressiveDiscountSettings s, PricedCart cart) {
        int count = 0;
        for (PricedLine line : cart.lines()) {
            if (!isEligible(s, line.product())) continue;
            count += switch (s.getCountingMethod()) {
                case UNIQUE_PRODUCTS -> 1;
                case TOTAL_QUANTITY -> Math.max(0, line.quantity());
            };
        }
        return count;
    }

    /** Whether a product falls within the configured scope. */
    public boolean isEligible(ProgressiveDiscountSettings s, Product product) {
        if (product == null) return false;
        return switch (s.getEligibility()) {
            case ALL_PRODUCTS -> true;
            case SELECTED_PRODUCTS ->
                    s.getEligibleProductIds() != null
                            && s.getEligibleProductIds().contains(product.getId());
            case CATEGORY -> {
                Set<Long> wanted = s.getEligibleCategoryIds();
                if (wanted == null || wanted.isEmpty()) yield false;
                Set<Long> productCats = product.getCategories() == null ? Set.of()
                        : product.getCategories().stream().map(Category::getId).collect(Collectors.toSet());
                yield productCats.stream().anyMatch(wanted::contains);
            }
        };
    }

    /**
     * Accrues one redemption's analytics onto the singleton row. Must run inside the
     * order transaction so it rolls back with the order on failure. No-op for a null
     * or zero application.
     */
    @Transactional
    public void recordUsage(AppliedProgressive applied) {
        if (applied == null || applied.discountAmount() <= 0) return;
        repository.addRedemptionTotals(ProgressiveDiscountSettings.SINGLETON_ID, applied.discountAmount());
    }

    // --- Admin read/update ---

    @Transactional
    public ProgressiveSettingsResponse view() {
        return ProgressiveSettingsResponse.from(getOrCreate(), currency());
    }

    @Transactional
    public ProgressiveSettingsResponse update(ProgressiveSettingsRequest req, String actorEmail) {
        ProgressiveDiscountSettings s = getOrCreate();

        s.setEnabled(req.enabled());
        s.setDiscountPerAdditionalItem(Math.max(0, req.discountPerAdditionalItem()));
        s.setMaxDiscount(Math.max(0, req.maxDiscount()));
        s.setMinItems(Math.max(1, req.minItems()));
        s.setCountingMethod(parseCounting(req.countingMethod()));
        s.setEligibility(parseEligibility(req.eligibility()));
        s.setEligibleCategoryIds(new HashSet<>(req.eligibleCategoryIds() != null ? req.eligibleCategoryIds() : Set.of()));
        s.setEligibleProductIds(new HashSet<>(req.eligibleProductIds() != null ? req.eligibleProductIds() : Set.of()));
        s.setCombineWithBundle(req.combineWithBundle());
        s.setCombineWithCoupons(req.combineWithCoupons());
        s.setStartsOn(parseDate(req.startsOn()));
        s.setEndsOn(parseDate(req.endsOn()));
        s.setDisplayOnProduct(req.displayOnProduct());
        s.setDisplayInCart(req.displayInCart());

        // Bump the rule version so orders placed after this edit record the NEW rule,
        // while historical orders keep the version (and discount) they were charged.
        s.setVersion(s.getVersion() + 1);
        s.setUpdatedByEmail(actorEmail);
        s.setUpdatedAt(Instant.now());

        repository.save(s);
        return ProgressiveSettingsResponse.from(s, currency());
    }

    /** Storefront-safe config: real params when active, an "off" stub otherwise. */
    @Transactional(readOnly = true)
    public ProgressivePublicConfig publicConfig() {
        ProgressiveDiscountSettings active = activeConfig();
        return active != null
                ? ProgressivePublicConfig.from(active, currency())
                : ProgressivePublicConfig.disabled(currency());
    }

    private String currency() {
        try {
            return storeSettingsService.getOrCreate().getCurrency();
        } catch (Exception e) {
            return "DH";
        }
    }

    private ProgressiveCountingMethod parseCounting(String raw) {
        try {
            return raw == null ? ProgressiveCountingMethod.UNIQUE_PRODUCTS
                    : ProgressiveCountingMethod.valueOf(raw.trim());
        } catch (IllegalArgumentException e) {
            return ProgressiveCountingMethod.UNIQUE_PRODUCTS;
        }
    }

    private ProgressiveEligibility parseEligibility(String raw) {
        try {
            return raw == null ? ProgressiveEligibility.ALL_PRODUCTS
                    : ProgressiveEligibility.valueOf(raw.trim());
        } catch (IllegalArgumentException e) {
            return ProgressiveEligibility.ALL_PRODUCTS;
        }
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDate.parse(raw.trim());
        } catch (Exception e) {
            return null;
        }
    }
}
