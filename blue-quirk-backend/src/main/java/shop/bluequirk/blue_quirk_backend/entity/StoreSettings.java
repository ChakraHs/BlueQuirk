package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Singleton row (id = 1) holding admin-configurable storefront settings:
 * branding (store name + logo), shipping economics (flat fee + free-shipping
 * threshold + currency) and the default language. Persisting these in the DB —
 * rather than in application.properties — lets the admin change them at runtime,
 * like a real store dashboard.
 */
@Entity
@Table(name = "store_settings")
public class StoreSettings {

    // Fixed singleton id; there is ever only one settings row.
    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    @Column(nullable = false)
    private String storeName;

    // Public URL of the store logo (R2). Null = show the text name only.
    private String logoUrl;

    @Column(nullable = false)
    private double shippingFee;

    @Column(nullable = false)
    private double freeShippingThreshold;

    @Column(nullable = false)
    private String currency;

    // Default storefront language ("fr", "ar" or "en") used when a visitor has no
    // explicit preference yet.
    @Column(nullable = false)
    private String defaultLang;

    // --- Home hero section (all nullable; blank falls back to the built-in
    // translated defaults / a default background). ---
    // Title + subtitle are stored per language (fr / en / ar) so the admin can
    // localize the hero copy; the storefront picks the column for the active lang.
    @Column(name = "hero_title_fr")
    private String heroTitleFr;

    @Column(name = "hero_title_en")
    private String heroTitleEn;

    @Column(name = "hero_title_ar")
    private String heroTitleAr;

    @Column(name = "hero_subtitle_fr", length = 1000)
    private String heroSubtitleFr;

    @Column(name = "hero_subtitle_en", length = 1000)
    private String heroSubtitleEn;

    @Column(name = "hero_subtitle_ar", length = 1000)
    private String heroSubtitleAr;

    // Primary ("shop all") button styling — text + background colour (hex). Null
    // falls back to the built-in white-on-blue style.
    @Column(name = "hero_btn_text_color")
    private String heroBtnTextColor;

    @Column(name = "hero_btn_bg_color")
    private String heroBtnBgColor;

    // Background color (hex, e.g. #1e3a8a). Used when no hero image is set.
    @Column(name = "hero_bg_color")
    private String heroBgColor;

    // Background image for desktop / wide screens.
    @Column(name = "hero_image_url")
    private String heroImageUrl;

    // Background image for phones (portrait). Falls back to the desktop image.
    @Column(name = "hero_image_mobile_url")
    private String heroImageMobileUrl;

    public StoreSettings() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public double getShippingFee() { return shippingFee; }
    public void setShippingFee(double shippingFee) { this.shippingFee = shippingFee; }

    public double getFreeShippingThreshold() { return freeShippingThreshold; }
    public void setFreeShippingThreshold(double freeShippingThreshold) {
        this.freeShippingThreshold = freeShippingThreshold;
    }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getDefaultLang() { return defaultLang; }
    public void setDefaultLang(String defaultLang) { this.defaultLang = defaultLang; }

    public String getHeroTitleFr() { return heroTitleFr; }
    public void setHeroTitleFr(String heroTitleFr) { this.heroTitleFr = heroTitleFr; }

    public String getHeroTitleEn() { return heroTitleEn; }
    public void setHeroTitleEn(String heroTitleEn) { this.heroTitleEn = heroTitleEn; }

    public String getHeroTitleAr() { return heroTitleAr; }
    public void setHeroTitleAr(String heroTitleAr) { this.heroTitleAr = heroTitleAr; }

    public String getHeroSubtitleFr() { return heroSubtitleFr; }
    public void setHeroSubtitleFr(String heroSubtitleFr) { this.heroSubtitleFr = heroSubtitleFr; }

    public String getHeroSubtitleEn() { return heroSubtitleEn; }
    public void setHeroSubtitleEn(String heroSubtitleEn) { this.heroSubtitleEn = heroSubtitleEn; }

    public String getHeroSubtitleAr() { return heroSubtitleAr; }
    public void setHeroSubtitleAr(String heroSubtitleAr) { this.heroSubtitleAr = heroSubtitleAr; }

    public String getHeroBtnTextColor() { return heroBtnTextColor; }
    public void setHeroBtnTextColor(String heroBtnTextColor) { this.heroBtnTextColor = heroBtnTextColor; }

    public String getHeroBtnBgColor() { return heroBtnBgColor; }
    public void setHeroBtnBgColor(String heroBtnBgColor) { this.heroBtnBgColor = heroBtnBgColor; }

    public String getHeroBgColor() { return heroBgColor; }
    public void setHeroBgColor(String heroBgColor) { this.heroBgColor = heroBgColor; }

    public String getHeroImageUrl() { return heroImageUrl; }
    public void setHeroImageUrl(String heroImageUrl) { this.heroImageUrl = heroImageUrl; }

    public String getHeroImageMobileUrl() { return heroImageMobileUrl; }
    public void setHeroImageMobileUrl(String heroImageMobileUrl) { this.heroImageMobileUrl = heroImageMobileUrl; }
}
