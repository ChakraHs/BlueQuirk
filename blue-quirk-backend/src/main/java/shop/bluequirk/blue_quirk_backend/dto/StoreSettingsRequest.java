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
        // Home hero section (all optional). Title + subtitle are per-language.
        String heroTitleFr,
        String heroTitleEn,
        String heroTitleAr,
        String heroSubtitleFr,
        String heroSubtitleEn,
        String heroSubtitleAr,
        String heroBtnTextColor,
        String heroBtnBgColor,
        String heroBgColor,
        String heroImageUrl,
        String heroImageMobileUrl,
        // Theme colors (all optional; blank clears back to the frontend defaults).
        String primaryColor,
        String primaryHoverColor,
        String secondaryColor,
        String accentColor,
        String backgroundColor,
        String surfaceColor,
        String textColor,
        String borderColor,
        String successColor,
        String warningColor,
        String errorColor,
        // Microsoft Clarity (session replay only). enabled null = leave unchanged;
        // projectId blank clears it.
        Boolean clarityEnabled,
        String clarityProjectId
) {}
