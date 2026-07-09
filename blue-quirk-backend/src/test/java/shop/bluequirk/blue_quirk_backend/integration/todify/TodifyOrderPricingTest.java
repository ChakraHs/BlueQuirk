package shop.bluequirk.blue_quirk_backend.integration.todify;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    // --- variant key mapping (Todify wants lowercase keys; values kept verbatim) ---

    @Test
    void formatsShippingMoney() {
        assertThat(TodifyService.formatMoney(0)).isEqualTo("0");       // free shipping
        assertThat(TodifyService.formatMoney(29.0)).isEqualTo("29");
        assertThat(TodifyService.formatMoney(29.5)).isEqualTo("29.5");
        assertThat(TodifyService.formatMoney(29.999)).isEqualTo("30");
    }

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
