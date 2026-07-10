package shop.bluequirk.blue_quirk_backend.finance.dto;

/**
 * Aggregated financial KPIs for a date window (all money in MAD). Built by
 * {@link shop.bluequirk.blue_quirk_backend.finance.service.FinanceReportService}
 * from frozen order snapshots — cancelled orders excluded.
 */
public record FinanceSummary(
        String from,               // ISO date-time window start (inclusive)
        String to,                 // ISO date-time window end (exclusive)
        double revenue,            // Σ goods revenue (subtotal, pre-discount)
        double cost,               // Σ product cost
        double grossProfit,        // revenue − cost
        double marginPercent,      // grossProfit / revenue
        double netSales,           // revenue − discounts
        double operationalRevenue, // revenue + shipping
        double discount,
        double shipping,
        double collected,          // Σ amount customers paid (final total)
        long orders,
        long productsSold,         // Σ units
        double averageOrderValue   // collected / orders
) {}
