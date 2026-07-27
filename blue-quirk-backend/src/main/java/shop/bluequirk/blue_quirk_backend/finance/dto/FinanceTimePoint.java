package shop.bluequirk.blue_quirk_backend.finance.dto;

/** One bucket of a financial time series (day or month). Money in MAD. */
public record FinanceTimePoint(
        String period,   // "YYYY-MM-DD" (daily) or "YYYY-MM" (monthly)
        long orders,
        double revenue,     // Σ goods subtotal (pre-shipping)
        double collected,   // Σ order total (incl. customer shipping) — the amount collected
        double cost,
        double profit,
        double marginPercent
) {}
