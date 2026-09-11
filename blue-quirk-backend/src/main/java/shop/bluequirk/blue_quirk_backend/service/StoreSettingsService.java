package shop.bluequirk.blue_quirk_backend.service;

import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.dto.StoreSettingsRequest;
import shop.bluequirk.blue_quirk_backend.entity.StoreSettings;
import shop.bluequirk.blue_quirk_backend.repository.StoreSettingsRepository;

/**
 * Reads and writes the singleton {@link StoreSettings} row. On first access the
 * row is seeded from application.properties, so behaviour is unchanged until an
 * admin edits it. This is the single source of truth for shipping economics and
 * storefront branding.
 */
@Service
public class StoreSettingsService {

    private static final Set<String> SUPPORTED_LANGS = Set.of("fr", "ar", "en");

    // A Meta Pixel (dataset) id is a 15–16 digit number. We validate the shape so
    // a typo can't silently disable tracking or inject junk into the pixel tag.
    private static final Pattern META_PIXEL_ID = Pattern.compile("\\d{15,16}");

    private final StoreSettingsRepository repository;

    // Seed defaults — only used to create the row the very first time.
    private final double defaultShippingFee;
    private final double defaultRealShippingCost;
    private final double defaultThreshold;
    private final String defaultCurrency;
    private final String defaultStoreName;
    private final String defaultLang;

    public StoreSettingsService(
            StoreSettingsRepository repository,
            @Value("${order.shipping-fee:0}") double defaultShippingFee,
            @Value("${order.real-shipping-cost:0}") double defaultRealShippingCost,
            @Value("${order.free-shipping-threshold:0}") double defaultThreshold,
            @Value("${order.currency:DH}") String defaultCurrency,
            @Value("${store.name:RedQuirk}") String defaultStoreName,
            @Value("${store.default-lang:fr}") String defaultLang) {
        this.repository = repository;
        this.defaultShippingFee = defaultShippingFee;
        this.defaultRealShippingCost = defaultRealShippingCost;
        this.defaultThreshold = defaultThreshold;
        this.defaultCurrency = defaultCurrency;
        this.defaultStoreName = defaultStoreName;
        this.defaultLang = normalizeLang(defaultLang);
    }

    /** The settings row, created with seeded defaults if it does not exist yet. */
    @Transactional
    public StoreSettings getOrCreate() {
        return repository.findById(StoreSettings.SINGLETON_ID).orElseGet(() -> {
            StoreSettings s = new StoreSettings();
            s.setId(StoreSettings.SINGLETON_ID);
            s.setStoreName(defaultStoreName);
            s.setLogoUrl(null);
            s.setShippingFee(defaultShippingFee);
            s.setRealShippingCost(defaultRealShippingCost);
            s.setFreeShippingThreshold(defaultThreshold);
            s.setCurrency(defaultCurrency);
            s.setDefaultLang(defaultLang);
            return repository.save(s);
        });
    }

    /** Apply a partial/full update from the admin. Null fields are left unchanged. */
    @Transactional
    public StoreSettings update(StoreSettingsRequest req) {
        StoreSettings s = getOrCreate();
        if (req.storeName() != null && !req.storeName().isBlank()) {
            s.setStoreName(req.storeName().trim());
        }
        // logoUrl: allow clearing with an empty string, set with a value, ignore null.
        if (req.logoUrl() != null) {
            s.setLogoUrl(req.logoUrl().isBlank() ? null : req.logoUrl().trim());
        }
        if (req.shippingFee() != null) {
            s.setShippingFee(Math.max(0, req.shippingFee()));
        }
        if (req.realShippingCost() != null) {
            s.setRealShippingCost(Math.max(0, req.realShippingCost()));
        }
        if (req.freeShippingThreshold() != null) {
            s.setFreeShippingThreshold(Math.max(0, req.freeShippingThreshold()));
        }
        if (req.currency() != null && !req.currency().isBlank()) {
            s.setCurrency(req.currency().trim());
        }
        if (req.defaultLang() != null) {
            s.setDefaultLang(normalizeLang(req.defaultLang()));
        }
        // Hero fields: an empty string clears the value (back to defaults), a
        // value sets it, null leaves it unchanged.
        if (req.heroTitleFr() != null) {
            s.setHeroTitleFr(blankToNull(req.heroTitleFr()));
        }
        if (req.heroTitleEn() != null) {
            s.setHeroTitleEn(blankToNull(req.heroTitleEn()));
        }
        if (req.heroTitleAr() != null) {
            s.setHeroTitleAr(blankToNull(req.heroTitleAr()));
        }
        if (req.heroSubtitleFr() != null) {
            s.setHeroSubtitleFr(blankToNull(req.heroSubtitleFr()));
        }
        if (req.heroSubtitleEn() != null) {
            s.setHeroSubtitleEn(blankToNull(req.heroSubtitleEn()));
        }
        if (req.heroSubtitleAr() != null) {
            s.setHeroSubtitleAr(blankToNull(req.heroSubtitleAr()));
        }
        if (req.heroBtnTextColor() != null) {
            s.setHeroBtnTextColor(blankToNull(req.heroBtnTextColor()));
        }
        if (req.heroBtnBgColor() != null) {
            s.setHeroBtnBgColor(blankToNull(req.heroBtnBgColor()));
        }
        if (req.heroBgColor() != null) {
            s.setHeroBgColor(blankToNull(req.heroBgColor()));
        }
        if (req.heroImageUrl() != null) {
            s.setHeroImageUrl(blankToNull(req.heroImageUrl()));
        }
        if (req.heroImageMobileUrl() != null) {
            s.setHeroImageMobileUrl(blankToNull(req.heroImageMobileUrl()));
        }
        // Theme colors: an empty string clears the value (back to the frontend
        // default), a value sets it, null leaves it unchanged.
        if (req.primaryColor() != null) {
            s.setPrimaryColor(blankToNull(req.primaryColor()));
        }
        if (req.primaryHoverColor() != null) {
            s.setPrimaryHoverColor(blankToNull(req.primaryHoverColor()));
        }
        if (req.secondaryColor() != null) {
            s.setSecondaryColor(blankToNull(req.secondaryColor()));
        }
        if (req.accentColor() != null) {
            s.setAccentColor(blankToNull(req.accentColor()));
        }
        if (req.backgroundColor() != null) {
            s.setBackgroundColor(blankToNull(req.backgroundColor()));
        }
        if (req.surfaceColor() != null) {
            s.setSurfaceColor(blankToNull(req.surfaceColor()));
        }
        if (req.textColor() != null) {
            s.setTextColor(blankToNull(req.textColor()));
        }
        if (req.borderColor() != null) {
            s.setBorderColor(blankToNull(req.borderColor()));
        }
        if (req.successColor() != null) {
            s.setSuccessColor(blankToNull(req.successColor()));
        }
        if (req.warningColor() != null) {
            s.setWarningColor(blankToNull(req.warningColor()));
        }
        if (req.errorColor() != null) {
            s.setErrorColor(blankToNull(req.errorColor()));
        }
        // Microsoft Clarity: enabled null = unchanged; project id blank = cleared.
        if (req.clarityEnabled() != null) {
            s.setClarityEnabled(req.clarityEnabled());
        }
        if (req.clarityProjectId() != null) {
            s.setClarityProjectId(blankToNull(req.clarityProjectId()));
        }
        // Checkout coupon block: enabled null = unchanged.
        if (req.couponEnabled() != null) {
            s.setCouponEnabled(req.couponEnabled());
        }
        // Meta Ads (Facebook Pixel): enabled null = unchanged; pixel id blank clears
        // it, otherwise it must be a 15–16 digit number.
        if (req.metaTrackingEnabled() != null) {
            s.setMetaTrackingEnabled(req.metaTrackingEnabled());
        }
        if (req.metaPixelId() != null) {
            String pixelId = blankToNull(req.metaPixelId());
            if (pixelId != null && !META_PIXEL_ID.matcher(pixelId).matches()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid Meta Pixel ID: it must be a 15–16 digit number.");
            }
            s.setMetaPixelId(pixelId);
        }
        // Customer reviews / social proof: booleans null = unchanged; the two ints are
        // clamped to sane ranges so a bad admin value can't break the storefront.
        if (req.reviewsEnabled() != null) {
            s.setReviewsEnabled(req.reviewsEnabled());
        }
        if (req.reviewsAutoApprove() != null) {
            s.setReviewsAutoApprove(req.reviewsAutoApprove());
        }
        if (req.reviewPhotosEnabled() != null) {
            s.setReviewPhotosEnabled(req.reviewPhotosEnabled());
        }
        if (req.reviewRequestEmailEnabled() != null) {
            s.setReviewRequestEmailEnabled(req.reviewRequestEmailEnabled());
        }
        if (req.reviewRequestDelayDays() != null) {
            // 0–90 days; anything outside is clamped rather than rejected.
            s.setReviewRequestDelayDays(Math.max(0, Math.min(90, req.reviewRequestDelayDays())));
        }
        if (req.reviewsPerPage() != null) {
            // 1–50 cards per page.
            s.setReviewsPerPage(Math.max(1, Math.min(50, req.reviewsPerPage())));
        }
        return repository.save(s);
    }

    private String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    /** Persists a settings instance (used for focused single-field toggles). */
    @Transactional
    public StoreSettings save(StoreSettings settings) {
        return repository.save(settings);
    }

    /** Sets just the logo URL (used by the logo upload endpoint). */
    @Transactional
    public StoreSettings updateLogo(String logoUrl) {
        StoreSettings s = getOrCreate();
        s.setLogoUrl(logoUrl);
        return repository.save(s);
    }

    private String normalizeLang(String lang) {
        String l = lang == null ? "" : lang.trim().toLowerCase();
        return SUPPORTED_LANGS.contains(l) ? l : "fr";
    }
}
