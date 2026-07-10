package shop.bluequirk.blue_quirk_backend.finance.dto;

/** One bucket of a financial time series (day or month). Money in MAD. */
public record FinanceTimePoint(
        String period,   // "YYYY-MM-DD" (daily) or "YYYY-MM" (monthly)
        long orders,
        double revenue,
        double cost,
        double profit,
        double marginPercent
) {}
