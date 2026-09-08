package shop.bluequirk.blue_quirk_backend.bundle.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.bundle.dto.BundleOfferPublic;
import shop.bluequirk.blue_quirk_backend.bundle.mapper.BundleMapper;
import shop.bluequirk.blue_quirk_backend.bundle.repository.BundleOfferRepository;

/**
 * Public, non-secret bundle configuration for the storefront. Exposes the active
 * offers' display parameters (scope + pricing) so product pages and the cart can
 * show "build your set" UX. The backend remains the single source of truth: the
 * actual discount is always recomputed at {@code POST /api/cart/quote} and at
 * checkout — this endpoint is display-only.
 */
@RestController
@RequestMapping("/api/shop/bundles")
public class BundlePublicController {

    private final BundleOfferRepository repository;
    private final BundleMapper mapper;

    public BundlePublicController(BundleOfferRepository repository, BundleMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    /** All enabled offers (highest priority first). Empty list when none are active. */
    @GetMapping("/active")
    public List<BundleOfferPublic> active() {
        return repository.findByActiveTrueOrderByPriorityDescIdDesc().stream()
                .map(mapper::toPublic)
                .toList();
    }
}
