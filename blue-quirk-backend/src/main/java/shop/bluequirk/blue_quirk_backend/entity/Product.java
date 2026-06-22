package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.entity.translation.ProductTranslation;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Lob
    private String description; // will store HTML text

    @Column(nullable = false)
    private double price;

    // Units in stock for this product. Defaults to 0; used for low-stock alerts
    // and the admin inventory view.
    @Column(nullable = false)
    private Integer stockQuantity = 0;

    @Enumerated(EnumType.STRING) // store as text, not number
    private ProductStatus status;

    @ManyToMany
    @JoinTable(
        name = "product_attribute_values",
        joinColumns = @JoinColumn(name = "product_id"),
        inverseJoinColumns = @JoinColumn(name = "attribute_value_id")
    )
    private Set<AttributeValue> selectedValues = new HashSet<>();

    
    @ManyToMany
    @JoinTable(
        name = "product_images",
        joinColumns = @JoinColumn(name = "product_id"),
        inverseJoinColumns = @JoinColumn(name = "image_id")
    )
    private Set<Image> images; // initially null

    
    
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "product_categories",
        joinColumns = @JoinColumn(name = "product_id"),
        inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    private Set<Category> categories = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ProductTranslation> translations = new HashSet<>();
    
    // Constructors
    public Product() {}

    public Product(String name, String description, double price, String imageUrl) {
        this.name = name;
        this.description = description;
        this.price = price;
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public Integer getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }

    public Set<AttributeValue> getSelectedValues() { return selectedValues; }
    public void setSelectedValues(Set<AttributeValue> selectedValues) { this.selectedValues = selectedValues; }
    
    public Set<Image> getImages() { return images; }
    public void setImages(Set<Image> images) { this.images = images; }
    
    public ProductStatus getStatus() {
        return status;
    }

    public void setStatus(ProductStatus status) {
        this.status = status;
    }

    public Set<ProductTranslation> getTranslations() {
        return translations;
    }

    public void setTranslations(Set<ProductTranslation> translations) {
        this.translations = translations;
    }
    
    
}
