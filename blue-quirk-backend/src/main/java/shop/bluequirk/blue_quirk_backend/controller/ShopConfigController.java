package shop.bluequirk.blue_quirk_backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.entity.StoreSettings;
import shop.bluequirk.blue_quirk_backend.service.StoreSettingsService;

/**
 * Public, non-secret storefront configuration. Exposes branding (store name +
 * logo), shipping economics (flat fee + free-shipping threshold + currency) and
 * the default language so the frontend renders headers, banners and the free
 * shipping progress bar without hardcoding anything. The backend stays the single
 * source of truth (it also computes the actual order totals). Values come from
 * the admin-editable {@link StoreSettings}.
 */
@RestController
@RequestMapping("/api/shop")
public class ShopConfigController {

    private final StoreSettingsService settingsService;

    public ShopConfigController(StoreSettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("/config")
    public ShopConfig getConfig() {
        StoreSettings s = settingsService.getOrCreate();
        return new ShopConfig(
                s.getCurrency(),
                s.getShippingFee(),
                s.getFreeShippingThreshold(),
                s.getStoreName(),
                s.getLogoUrl(),
                s.getDefaultLang(),
                s.getHeroTitle(),
                s.getHeroSubtitle(),
                s.getHeroBgColor(),
                s.getHeroImageUrl(),
                s.getHeroImageMobileUrl());
    }

    public record ShopConfig(
            String currency,
            double shippingFee,
            double freeShippingThreshold,
            String storeName,
            String logoUrl,
            String defaultLang,
            String heroTitle,
            String heroSubtitle,
            String heroBgColor,
            String heroImageUrl,
            String heroImageMobileUrl) {}
}
