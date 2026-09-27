package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;
import java.util.Set;

import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.domain.ProductType;
import shop.bluequirk.blue_quirk_backend.entity.Image;
import shop.bluequirk.blue_quirk_backend.entity.ProductVideo;
import shop.bluequirk.blue_quirk_backend.entity.translation.ProductTranslation;

public class ProductDTO {

	private Long id;
    private String name;
    private Double price;
    // Optional "compare-at" / previous price (display-only strikethrough reference;
    // never charged). 0/null clears it. Validated non-negative in ProductService.
    private Double compareAtPrice;
    // Admin-only purchase cost (MAD). Optional on update (null = leave unchanged);
    // validated non-negative in ProductService. Only submitted via the admin-only
    // create/update endpoints, so it is safe to accept here.
    private Double cost;
    private Integer stockQuantity;
    private String description;
    // Physical garment type ("T_SHIRT" / "HOODIE"). Optional: null on create
    // defaults to T_SHIRT; null on update leaves the stored type unchanged.
    private ProductType productType;
    // Legacy free-text materials (e.g. "100% Cotton"). Optional; kept for backward
    // compatibility. When `materialComposition` is submitted the service derives
    // this string from it, so callers normally only send the structured list.
    private String material;
    // Structured composition (Cotton 67% + Polyester 33%). When present (non-null)
    // it is validated (>0 each, total 100) and replaces the stored composition;
    // null leaves the existing composition untouched on update.
    private List<MaterialComponentDto> materialComposition;
    private String fabricWeight;
    private String fit;
    private ProductStatus status;
    
    private Set<Image> images;

    // Optional featured video (videoUrl/posterImageUrl/duration/fileSize). Null or
    // a blank videoUrl means "no video" / remove the existing one.
    private ProductVideo video;

    private Set<AttributeDto> attributes;

    private Set<ProductTranslation> translations;

    // Categories this product belongs to (many-to-many). Optional: when null the
    // product's category links are left untouched on update; when present (incl.
    // empty) they are replaced with exactly these ids.
    private List<Long> categoryIds;

    public ProductDTO() {}

    public ProductDTO(String name, double price, String description, Set<AttributeDto> attributes, Set<Image> images) {
        this.name = name;
        this.price = price;
        this.description = description;
        this.attributes = attributes;
        this.images = images;
    }

    // Getters & Setters
    
    public Long getId() { return id; }
  
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public Double getCompareAtPrice() { return compareAtPrice; }
    public void setCompareAtPrice(Double compareAtPrice) { this.compareAtPrice = compareAtPrice; }

    public Double getCost() { return cost; }
    public void setCost(Double cost) { this.cost = cost; }

    public Integer getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public ProductType getProductType() { return productType; }
    public void setProductType(ProductType productType) { this.productType = productType; }

    public String getMaterial() { return material; }
    public void setMaterial(String material) { this.material = material; }

    public List<MaterialComponentDto> getMaterialComposition() { return materialComposition; }
    public void setMaterialComposition(List<MaterialComponentDto> materialComposition) {
        this.materialComposition = materialComposition;
    }

    public String getFabricWeight() { return fabricWeight; }
    public void setFabricWeight(String fabricWeight) { this.fabricWeight = fabricWeight; }

    public String getFit() { return fit; }
    public void setFit(String fit) { this.fit = fit; }

    public Set<AttributeDto> getAttributes() { return attributes; }
    public void setAttributes(Set<AttributeDto> attributes) { this.attributes = attributes; }
    
    public ProductStatus getStatus() { return status; }
    public void setStatus(ProductStatus status) { this.status = status; }
    
    public Set<Image> getImages() { return images; }
    public void setImages(Set<Image> images) { this.images = images; }

    public ProductVideo getVideo() { return video; }
    public void setVideo(ProductVideo video) { this.video = video; }

    public Set<ProductTranslation> getTranslations() { return translations; }
    public void setTranslations(Set<ProductTranslation> translations) { this.translations = translations; }

    public List<Long> getCategoryIds() { return categoryIds; }
    public void setCategoryIds(List<Long> categoryIds) { this.categoryIds = categoryIds; }


}
