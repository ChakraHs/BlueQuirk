package shop.bluequirk.blue_quirk_backend.finance.dto;

/**
 * Per-product financial performance over a window, aggregated from order line
 * snapshots. Used for the "best selling", "most profitable" and "lowest margin"
 * rankings.
 */
public record ProductFinancialRow(
        Long productId,
        String name,
        long unitsSold,
        double revenue,
        double cost,
        double profit,
        double marginPercent
) {}
