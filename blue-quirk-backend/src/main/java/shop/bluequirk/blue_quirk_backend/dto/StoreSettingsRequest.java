package shop.bluequirk.blue_quirk_backend.dto;

/**
 * Admin payload for updating the store settings. All fields are applied; the
 * service validates/normalizes them (non-negative amounts, supported language).
 */
public record StoreSettingsRequest(
        String storeName,
        String logoUrl,
        Double shippingFee,
        Double freeShippingThreshold,
        String currency,
        String defaultLang,
        // Home hero section (all optional).
        String heroTitle,
        String heroSubtitle,
        String heroBgColor,
        String heroImageUrl,
        String heroImageMobileUrl
) {}
