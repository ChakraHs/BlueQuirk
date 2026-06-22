package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.*;
import shop.bluequirk.blue_quirk_backend.entity.translation.CategoryTranslation;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "categories")
public class Category {

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String slug; // URL-friendly (e.g. "t-shirts")

    private String description;

    // Optional: hierarchical categories (Men > T-Shirts)
    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Category parent;

    @OneToMany(mappedBy = "parent")
    private Set<Category> children = new HashSet<>();

    // Bidirectional (optional but recommended)
    @ManyToMany(mappedBy = "categories")
    private Set<Product> products = new HashSet<>();
    
    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<CategoryTranslation> translations = new HashSet<>();
    
    
    @Column(name = "image_url")
    private String imageUrl;
    

	public String getImageUrl() {
		return imageUrl;
	}

	public void setImageUrl(String imageUrl) {
		this.imageUrl = imageUrl;
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getSlug() {
		return slug;
	}

	public void setSlug(String slug) {
		this.slug = slug;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public Category getParent() {
		return parent;
	}

	public void setParent(Category parent) {
		this.parent = parent;
	}

	public Set<Category> getChildren() {
		return children;
	}

	public void setChildren(Set<Category> children) {
		this.children = children;
	}

	public Set<Product> getProducts() {
		return products;
	}

	public void setProducts(Set<Product> products) {
		this.products = products;
	}    
	
	 public Set<CategoryTranslation> getTranslations() {
			return translations;
	}

	public void setTranslations(Set<CategoryTranslation> translations) {
		this.translations = translations;
	}
    
}