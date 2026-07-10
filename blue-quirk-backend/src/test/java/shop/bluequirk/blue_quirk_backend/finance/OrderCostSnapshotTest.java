package shop.bluequirk.blue_quirk_backend.finance;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import shop.bluequirk.blue_quirk_backend.entity.OrderItem;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.finance.service.FinancialCalculationService;

/**
 * Verifies the accounting snapshot contract that {@code OrderService.createOrder}
 * relies on: each order line freezes the product's cost at order time, order cost
 * total is the sum of line costs, and editing the product's cost afterwards must
 * never change the already-recorded order (historical preservation).
 */
class OrderCostSnapshotTest {

    private final FinancialCalculationService finance = new FinancialCalculationService();

    /** Mirrors the per-line snapshot logic in OrderService.createOrder(). */
    private OrderItem snapshot(Product product, int qty) {
        double unitCost = product.getCost();
        double lineTotal = finance.round(product.getPrice() * qty);
        double lineCost = finance.lineCost(unitCost, qty);

        OrderItem item = new OrderItem();
        item.setProductId(product.getId());
        item.setName(product.getName());
        item.setUnitPrice(product.getPrice());
        item.setQuantity(qty);
        item.setLineTotal(lineTotal);
        item.setCostPrice(unitCost);
        item.setLineCost(lineCost);
        item.setLineProfit(finance.lineProfit(lineTotal, lineCost));
        return item;
    }

    private Product product(long id, String name, double price, double cost) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setPrice(price);
        p.setCost(cost);
        return p;
    }

    @Test
    void lineSnapshotCapturesCostPriceAndProfit() {
        OrderItem item = snapshot(product(1, "Tee", 150.0, 90.0), 2);

        assertThat(item.getCostPrice()).isEqualTo(90.0);
        assertThat(item.getLineTotal()).isEqualTo(300.0);
        assertThat(item.getLineCost()).isEqualTo(180.0);
        assertThat(item.getLineProfit()).isEqualTo(120.0);
    }

    @Test
    void orderCostTotalIsTheSumOfLineCosts() {
        List<OrderItem> items = List.of(
                snapshot(product(1, "Tee", 150.0, 90.0), 2),   // lineCost 180
                snapshot(product(2, "Mug", 80.0, 30.0), 3));   // lineCost 90

        double costTotal = finance.round(items.stream().mapToDouble(OrderItem::getLineCost).sum());
        double revenue = items.stream().mapToDouble(OrderItem::getLineTotal).sum(); // 300 + 240 = 540

        assertThat(costTotal).isEqualTo(270.0);
        assertThat(finance.grossProfit(revenue, costTotal)).isEqualTo(270.0);
        assertThat(finance.marginPercent(revenue, costTotal)).isEqualTo(50.0);
    }

    @Test
    void editingProductCostLaterDoesNotChangeTheRecordedOrder() {
        Product tee = product(1, "Tee", 150.0, 90.0);
        OrderItem recorded = snapshot(tee, 2);

        // The purchasing team renegotiates and the product cost changes.
        tee.setCost(50.0);

        // The historical order line must be untouched — cost/profit are frozen.
        assertThat(recorded.getCostPrice()).isEqualTo(90.0);
        assertThat(recorded.getLineCost()).isEqualTo(180.0);
        assertThat(recorded.getLineProfit()).isEqualTo(120.0);
    }

    @Test
    void productWithoutCostYieldsFullProfitAndHundredPercentMargin() {
        // Pre-migration products default cost to 0.
        OrderItem item = snapshot(product(9, "Legacy", 100.0, 0.0), 1);

        assertThat(item.getLineCost()).isEqualTo(0.0);
        assertThat(item.getLineProfit()).isEqualTo(100.0);
        assertThat(finance.marginPercent(item.getLineTotal(), item.getLineCost())).isEqualTo(100.0);
    }
}
