package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * A deliverable city ("ville") with its own two-tier shipping economics, mirroring
 * {@link StoreSettings} but per city:
 * <ul>
 *   <li>{@code shippingFee} — the <b>customer</b> delivery price: shown at checkout
 *       and included in the order amount.</li>
 *   <li>{@code realShippingCost} — the store's <b>internal</b> logistics cost, used
 *       only for profit calculations; never exposed to the storefront.</li>
 * </ul>
 * When a checkout city is not in this list (e.g. a customer typed a custom one), the
 * flat values in {@link StoreSettings} are used instead — so behaviour is unchanged
 * until an admin adds cities.
 */
@Entity
@Table(name = "cities", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class City {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Customer delivery price shown at checkout / added to the order total. */
    @Column(nullable = false)
    private double shippingFee;

    /** Internal real logistics cost — profit only, never shown to the customer. */
    @Column(name = "real_shipping_cost", nullable = false)
    private double realShippingCost;

    @Column(nullable = false)
    private boolean active = true;

    /** Sort position for the admin table and the checkout suggestions. */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    public City() {}

    public City(String name, double shippingFee, double realShippingCost, boolean active, int sortOrder) {
        this.name = name;
        this.shippingFee = shippingFee;
        this.realShippingCost = realShippingCost;
        this.active = active;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getShippingFee() { return shippingFee; }
    public void setShippingFee(double shippingFee) { this.shippingFee = shippingFee; }

    public double getRealShippingCost() { return realShippingCost; }
    public void setRealShippingCost(double realShippingCost) { this.realShippingCost = realShippingCost; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
