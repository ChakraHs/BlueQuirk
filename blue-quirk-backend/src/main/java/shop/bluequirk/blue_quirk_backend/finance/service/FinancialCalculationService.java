package shop.bluequirk.blue_quirk_backend.finance.service;

import org.springframework.stereotype.Service;

/**
 * The single source of truth for every money calculation in BlueQuirk (margins,
 * profit, net sales, operational revenue). It is intentionally <b>stateless and
 * pure</b> — no repositories, no entities — so it can be reused identically by
 * product pricing, order snapshotting, the admin dashboard and any future
 * financial report without duplicating a single formula.
 *
 * <p>Vocabulary (matches the product spec):
 * <ul>
 *   <li><b>Revenue</b> — value of products sold (the goods/selling total, before
 *       discounts). Shipping is excluded.</li>
 *   <li><b>Gross Profit</b> = Revenue − Product Cost.</li>
 *   <li><b>Net Sales</b> = Revenue − Discounts.</li>
 *   <li><b>Operational Revenue</b> = Revenue + Shipping Fees.</li>
 * </ul>
 * Shipping is deliberately NOT subtracted from profit yet (that is a future
 * expense-accounting concern), so gross profit here is purely goods-based.
 *
 * <p>All monetary results are rounded to 2 decimals (MAD) and percentages to 2
 * decimals. Division guards return 0 rather than NaN/Infinity.
 */
@Service
public class FinancialCalculationService {

    // ---- Per-unit / per-line (product & order-item level) -------------------

    /** Gross margin in MAD for one unit: sellingPrice − cost. */
    public double grossMargin(double sellingPrice, double cost) {
        return round(sellingPrice - cost);
    }

    /**
     * Gross margin as a percentage of the selling price: (price − cost) / price.
     * Returns 0 when the selling price is 0 (undefined margin).
     */
    public double grossMarginPercent(double sellingPrice, double cost) {
        if (sellingPrice <= 0) return 0;
        return round((sellingPrice - cost) / sellingPrice * 100.0);
    }

    /** Cost of a line: unit cost × quantity. */
    public double lineCost(double unitCost, int quantity) {
        return round(unitCost * quantity);
    }

    /** Profit of a line: what was charged for the line minus its cost. */
    public double lineProfit(double lineTotal, double lineCost) {
        return round(lineTotal - lineCost);
    }

    // ---- Aggregate (order & report level) -----------------------------------

    /** Gross profit: Revenue − Product Cost. */
    public double grossProfit(double revenue, double cost) {
        return round(revenue - cost);
    }

    /** Net sales: Revenue − Discounts. */
    public double netSales(double revenue, double discount) {
        return round(revenue - discount);
    }

    /** Operational revenue: Revenue + Shipping fees. */
    public double operationalRevenue(double revenue, double shipping) {
        return round(revenue + shipping);
    }

    /**
     * Profit margin as a percentage of revenue: grossProfit / revenue.
     * Returns 0 when revenue is 0 (undefined margin).
     */
    public double marginPercent(double revenue, double cost) {
        if (revenue <= 0) return 0;
        return round((revenue - cost) / revenue * 100.0);
    }

    /** Average order value over a set of orders. Returns 0 when there are none. */
    public double averageOrderValue(double collectedTotal, long orderCount) {
        if (orderCount <= 0) return 0;
        return round(collectedTotal / orderCount);
    }

    /** Rounds a monetary/percentage value to 2 decimal places. */
    public double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
