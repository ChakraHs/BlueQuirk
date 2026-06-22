package shop.bluequirk.blue_quirk_backend.dto;

import java.util.List;
import java.util.Set;

import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.entity.Image;
import shop.bluequirk.blue_quirk_backend.entity.translation.ProductTranslation;

public class ProductDTO {

	private Long id;
    private String name;
    private Double price;
    private Integer stockQuantity;
    private String description;
    private ProductStatus status;
    
    private Set<Image> images; 

    private Set<AttributeDto> attributes;

    private Set<ProductTranslation> translations;

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

    public Integer getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Set<AttributeDto> getAttributes() { return attributes; }
    public void setAttributes(Set<AttributeDto> attributes) { this.attributes = attributes; }
    
    public ProductStatus getStatus() { return status; }
    public void setStatus(ProductStatus status) { this.status = status; }
    
    public Set<Image> getImages() { return images; }
    public void setImages(Set<Image> images) { this.images = images; }

    public Set<ProductTranslation> getTranslations() { return translations; }
    public void setTranslations(Set<ProductTranslation> translations) { this.translations = translations; }
     

}
