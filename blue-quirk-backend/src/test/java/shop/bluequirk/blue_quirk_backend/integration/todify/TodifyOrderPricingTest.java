package shop.bluequirk.blue_quirk_backend.integration.todify;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import shop.bluequirk.blue_quirk_backend.entity.OrderItem;
import shop.bluequirk.blue_quirk_backend.entity.Product;

/**
 * Guards the Todify order pricing rule: {@code items[].price} must be the per-unit
 * store price and strictly &gt; 0 (it drives the COD total the courier collects).
 */
class TodifyOrderPricingTest {

    private OrderItem item(double unitPrice) {
        OrderItem i = new OrderItem();
        i.setUnitPrice(unitPrice);
        i.setQuantity(1);
        return i;
    }

    private Product product(String name, double price) {
        Product p = new Product();
        p.setName(name);
        p.setPrice(price);
        return p;
    }

    @Test
    void usesTheOrderSnapshotPrice() {
        assertThat(TodifyService.resolveUnitPrice(item(100.0), product("Tee", 120.0)))
                .isEqualTo(100.0);
    }

    @Test
    void fallsBackToProductPriceWhenSnapshotIsZero() {
        assertThat(TodifyService.resolveUnitPrice(item(0), product("Tee", 149.0)))
                .isEqualTo(149.0);
    }

    @Test
    void roundsToCurrencyPrecision() {
        assertThat(TodifyService.resolveUnitPrice(item(149.999), product("Tee", 0)))
                .isEqualTo(150.0);
    }

    @Test
    void refusesToSendAZeroPrice() {
        // Both the order snapshot and the product price are 0 → would collect
        // nothing. Must fail loudly instead of sending price 0.
        assertThatThrownBy(() -> TodifyService.resolveUnitPrice(item(0), product("Play Ground", 0)))
                .isInstanceOf(TodifyApiException.class)
                .hasMessageContaining("Play Ground")
                .hasMessageContaining("price greater than 0");
    }

    // --- COD total distribution (shipping + discount folded into item prices) ---

    private static double sum(double[] prices, int[] qtys) {
        double s = 0;
        for (int i = 0; i < prices.length; i++) s += prices[i] * qtys[i];
        return Math.round(s * 100.0) / 100.0;
    }

    @Test
    void foldsShippingIntoASingleLineTotal() {
        // 149 goods + 29 shipping → the courier collects 178.
        double[] p = TodifyService.distributeTotal(new double[]{149.0}, new int[]{1}, 178.0);
        assertThat(p[0]).isEqualTo(178.0);
    }

    @Test
    void distributesTheTargetProportionallyAcrossLines() {
        // 100 + 200 = 300 goods, +30 shipping → 330 spread by weight.
        double[] p = TodifyService.distributeTotal(new double[]{100.0, 200.0}, new int[]{1, 1}, 330.0);
        assertThat(sum(p, new int[]{1, 1})).isEqualTo(330.0);
        assertThat(p[0]).isEqualTo(110.0);
        assertThat(p[1]).isEqualTo(220.0);
    }

    @Test
    void foldsADiscountWithoutEverGoingNegative() {
        // A heavy discount drops the COD to 129 across 50 + 250 goods.
        double[] p = TodifyService.distributeTotal(new double[]{50.0, 250.0}, new int[]{1, 1}, 129.0);
        assertThat(sum(p, new int[]{1, 1})).isEqualTo(129.0);
        assertThat(p[0]).isGreaterThan(0);
        assertThat(p[1]).isGreaterThan(0);
    }

    @Test
    void staysWithinACentForIndivisibleMultiUnitLines() {
        // 3 × 149 = 447 goods, +29 shipping → 476 can't split evenly over 3 units.
        double[] p = TodifyService.distributeTotal(new double[]{149.0}, new int[]{3}, 476.0);
        assertThat(sum(p, new int[]{3})).isCloseTo(476.0, within(0.03));
    }

    // --- variant key mapping (Todify wants lowercase keys; values kept verbatim) ---

    @Test
    void lowercasesVariantKeysButKeepsValues() {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode src = mapper.createObjectNode();
        src.put("Size", "M");
        src.put("Color", "#000000"); // value must stay exactly as Todify expects

        ObjectNode out = TodifyService.lowercaseKeys(src, mapper);

        assertThat(out.has("size")).isTrue();
        assertThat(out.has("color")).isTrue();
        assertThat(out.has("Size")).isFalse();
        assertThat(out.get("size").asText()).isEqualTo("M");
        assertThat(out.get("color").asText()).isEqualTo("#000000");
    }
}
