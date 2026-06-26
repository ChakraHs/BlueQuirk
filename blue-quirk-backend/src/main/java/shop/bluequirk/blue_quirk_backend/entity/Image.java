package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "images")
public class Image {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;

    // Legacy single URL. Kept for backward compatibility with existing rows and
    // any caller that still reads `url`. For images uploaded since the variant
    // pipeline was added, this points at the DISPLAY variant so old code paths
    // render the optimized (not the heavy original) image by default.
    private String url; // stored path or cloud URL

    // --- Optimized variants (auto-generated on upload; see ImageVariantService) ---
    // Small card/list image (~400px, WebP, < ~120KB). Used by home, collections,
    // categories, search, recommendations, wishlist and cart.
    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    // Mid-size image (~1200px, WebP) loaded on the product page / gallery and
    // reused by the hover magnifier — no extra request when hovering.
    @Column(name = "display_url")
    private String displayUrl;

    // The untouched original upload. Not loaded automatically; reserved for
    // fullscreen / deep zoom and high-resolution downloads.
    @Column(name = "original_url")
    private String originalUrl;

    // Whether this is the product's primary/cover image (used in listings/cards).
    // "primary" is a SQL reserved word, so the column is named is_primary.
    @Column(name = "is_primary")
    private boolean primary = false;

    // Display order within a product's gallery (ascending). The primary image is
    // also kept first by the service, but this preserves manual reordering.
    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    // Optional link to a color: the id of an AttributeValue under the COLOR
    // attribute. Null means the image is generic (shown for every color). We
    // store just the id (not a FK relation) to keep Image lightweight and its
    // JSON flat — the frontend already knows the color values from the product.
    @Column(name = "color_value_id")
    private Long colorValueId;

    // Constructors, getters, setters
    public Image() {}
    public Image(String fileName, String url) {
        this.fileName = fileName;
        this.url = url;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    // The variant getters fall back to the legacy `url` so that pre-migration
    // rows (which only have `url`) still serialize a usable value for every
    // variant — the frontend can always rely on these fields being present.
    public String getThumbnailUrl() { return thumbnailUrl != null ? thumbnailUrl : url; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }

    public String getDisplayUrl() { return displayUrl != null ? displayUrl : url; }
    public void setDisplayUrl(String displayUrl) { this.displayUrl = displayUrl; }

    public String getOriginalUrl() { return originalUrl != null ? originalUrl : url; }
    public void setOriginalUrl(String originalUrl) { this.originalUrl = originalUrl; }

    /**
     * Whether the optimized variants have actually been generated and stored
     * (reads the raw columns, not the fallback getters). Used by the backfill
     * job to skip rows that are already done. Not a bean getter, so it is not
     * serialized into the API response.
     */
    public boolean hasVariants() {
        return thumbnailUrl != null && displayUrl != null;
    }

    public boolean isPrimary() { return primary; }
    public void setPrimary(boolean primary) { this.primary = primary; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public Long getColorValueId() { return colorValueId; }
    public void setColorValueId(Long colorValueId) { this.colorValueId = colorValueId; }
}

