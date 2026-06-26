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

    // Default storefront language ("fr" or "ar") used when a visitor has no
    // explicit preference yet.
    @Column(nullable = false)
    private String defaultLang;

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
}
