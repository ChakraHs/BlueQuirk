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

    // Structured variant selection as a JSON object, e.g. {"Size":"M","Color":"Black"}.
    // Used to send the exact variant to Todify; the display `variant` above is kept
    // for emails/UI. Null for items without selectable attributes.
    @Column(name = "variant_attributes", length = 1024)
    private String variantAttributes;

    // Product SKU at order time (snapshot). Nullable — the catalog has no SKU
    // yet, but the column is here so historical accounting stays intact once one
    // is introduced (future-ready per the finance spec).
    @Column(name = "sku")
    private String sku;

    // Selling price of one unit at purchase time.
    @Column(nullable = false)
    private double unitPrice;

    // --- Financial snapshots (immutable accounting record) --------------------
    // Purchase cost of one unit at order time. Frozen: editing the product's cost
    // later must NEVER change this order's profit. Defaults to 0.
    @Column(name = "cost_price", nullable = false)
    private double costPrice = 0;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private double lineTotal;

    // costPrice × quantity, snapshotted.
    @Column(name = "line_cost", nullable = false)
    private double lineCost = 0;

    // lineTotal − lineCost, snapshotted (gross profit for this line).
    @Column(name = "line_profit", nullable = false)
    private double lineProfit = 0;

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

    public String getVariantAttributes() { return variantAttributes; }
    public void setVariantAttributes(String variantAttributes) { this.variantAttributes = variantAttributes; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(double unitPrice) { this.unitPrice = unitPrice; }

    public double getCostPrice() { return costPrice; }
    public void setCostPrice(double costPrice) { this.costPrice = costPrice; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public double getLineTotal() { return lineTotal; }
    public void setLineTotal(double lineTotal) { this.lineTotal = lineTotal; }

    public double getLineCost() { return lineCost; }
    public void setLineCost(double lineCost) { this.lineCost = lineCost; }

    public double getLineProfit() { return lineProfit; }
    public void setLineProfit(double lineProfit) { this.lineProfit = lineProfit; }
}
