package shop.bluequirk.blue_quirk_backend.finance;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import shop.bluequirk.blue_quirk_backend.finance.service.FinancialCalculationService;

/**
 * Locks down the central money formulas: margin, profit, net sales, operational
 * revenue, margin % and their divide-by-zero guards. Pure unit test — the
 * service has no dependencies.
 */
class FinancialCalculationServiceTest {

    private final FinancialCalculationService finance = new FinancialCalculationService();

    // ---- per-unit / per-line -------------------------------------------------

    @Test
    void grossMarginIsPriceMinusCost() {
        assertThat(finance.grossMargin(150.0, 90.0)).isEqualTo(60.0);
    }

    @Test
    void grossMarginPercentIsMarginOverPrice() {
        // (150 - 90) / 150 = 40%
        assertThat(finance.grossMarginPercent(150.0, 90.0)).isEqualTo(40.0);
    }

    @Test
    void grossMarginPercentIsZeroWhenPriceIsZero() {
        assertThat(finance.grossMarginPercent(0, 50.0)).isEqualTo(0.0);
    }

    @Test
    void negativeMarginWhenCostExceedsPrice() {
        assertThat(finance.grossMargin(100.0, 130.0)).isEqualTo(-30.0);
        assertThat(finance.grossMarginPercent(100.0, 130.0)).isEqualTo(-30.0);
    }

    @Test
    void lineCostAndProfit() {
        double lineCost = finance.lineCost(90.0, 3);   // 270
        assertThat(lineCost).isEqualTo(270.0);
        // line total 450 (3 × 150) − 270 cost = 180 profit
        assertThat(finance.lineProfit(450.0, lineCost)).isEqualTo(180.0);
    }

    // ---- aggregate -----------------------------------------------------------

    @Test
    void grossProfitIsRevenueMinusCost() {
        assertThat(finance.grossProfit(1000.0, 640.0)).isEqualTo(360.0);
    }

    @Test
    void netSalesSubtractsDiscountsButNotShipping() {
        assertThat(finance.netSales(1000.0, 120.0)).isEqualTo(880.0);
    }

    @Test
    void netProfitSubtractsCostAndRealShippingFromOrderTotal() {
        // Spec example: total 199 − product cost 85 − real shipping 32 = 82.
        assertThat(finance.netProfit(199.0, 85.0, 32.0)).isEqualTo(82.0);
    }

    @Test
    void netProfitUsesRealShippingNotTheCustomerShippingPrice() {
        // Free shipping (customer pays 0 for delivery) still deducts the real
        // logistics cost: total 199 − cost 85 − real shipping 32 = 82, not 114.
        assertThat(finance.netProfit(199.0, 85.0, 32.0)).isEqualTo(82.0);
        // A real shipping cost of 0 leaves the full goods margin intact.
        assertThat(finance.netProfit(199.0, 85.0, 0.0)).isEqualTo(114.0);
    }

    @Test
    void operationalRevenueAddsShipping() {
        assertThat(finance.operationalRevenue(1000.0, 29.0)).isEqualTo(1029.0);
    }

    @Test
    void marginPercentIsProfitOverRevenue() {
        // (1000 - 640) / 1000 = 36%
        assertThat(finance.marginPercent(1000.0, 640.0)).isEqualTo(36.0);
    }

    @Test
    void marginPercentIsZeroWhenRevenueIsZero() {
        assertThat(finance.marginPercent(0, 0)).isEqualTo(0.0);
    }

    @Test
    void averageOrderValueGuardsAgainstZeroOrders() {
        assertThat(finance.averageOrderValue(3000.0, 4)).isEqualTo(750.0);
        assertThat(finance.averageOrderValue(3000.0, 0)).isEqualTo(0.0);
    }

    @Test
    void resultsAreRoundedToTwoDecimals() {
        // 1/3 of 100 → 33.33, not 33.3333…
        assertThat(finance.marginPercent(300.0, 200.0)).isEqualTo(33.33);
    }
}
