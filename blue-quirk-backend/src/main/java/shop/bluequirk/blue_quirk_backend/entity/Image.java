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

    private String url; // stored path or cloud URL

    // Whether this is the product's primary/cover image (used in listings/cards).
    // "primary" is a SQL reserved word, so the column is named is_primary.
    @Column(name = "is_primary")
    private boolean primary = false;

    // Display order within a product's gallery (ascending). The primary image is
    // also kept first by the service, but this preserves manual reordering.
    @Column(name = "sort_order")
    private Integer sortOrder = 0;

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

    public boolean isPrimary() { return primary; }
    public void setPrimary(boolean primary) { this.primary = primary; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}

