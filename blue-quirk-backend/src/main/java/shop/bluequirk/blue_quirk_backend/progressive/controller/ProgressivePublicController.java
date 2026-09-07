package shop.bluequirk.blue_quirk_backend.progressive.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.progressive.dto.ProgressivePublicConfig;
import shop.bluequirk.blue_quirk_backend.progressive.service.ProgressiveDiscountService;

/**
 * Public, non-secret progressive-discount config for the storefront. Exposes only
 * the active campaign's display parameters so product pages/cards can show "add one
 * more and save" incentives. The backend remains the single source of truth: the
 * actual discount is always recomputed at {@code POST /api/cart/quote} and at
 * checkout — this endpoint is display-only, and returns {@code enabled:false} when
 * nothing is active.
 */
@RestController
@RequestMapping("/api/shop/progressive-discount")
public class ProgressivePublicController {

    private final ProgressiveDiscountService service;

    public ProgressivePublicController(ProgressiveDiscountService service) {
        this.service = service;
    }

    @GetMapping
    public ProgressivePublicConfig active() {
        return service.publicConfig();
    }
}
