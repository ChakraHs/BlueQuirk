package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.*;

/**
 * A single line in an {@link Order}. Product details (name, price, image,
 * selected variant) are snapshotted at order time so the order stays accurate
 * even if the catalog changes later.
 */
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    // Reference to the catalog product (not a FK relation — a snapshot id).
    private Long productId;

    @Column(nullable = false)
    private String name;

    private String imageUrl;

    // Human-readable variant selection, e.g. "Taille: M · Couleur: Bleu".
    @Column(length = 512)
    private String variant;

    @Column(nullable = false)
    private double unitPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private double lineTotal;

    public OrderItem() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getVariant() { return variant; }
    public void setVariant(String variant) { this.variant = variant; }

    public double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(double unitPrice) { this.unitPrice = unitPrice; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public double getLineTotal() { return lineTotal; }
    public void setLineTotal(double lineTotal) { this.lineTotal = lineTotal; }
}
