package shop.bluequirk.blue_quirk_backend.finance.dto;

/**
 * The dashboard header payload: the same KPI summary computed for three preset
 * windows in one round-trip, so the admin dashboard can render Today / This
 * Month / This Year cards without three separate calls.
 */
public record FinanceOverview(
        FinanceSummary today,
        FinanceSummary month,
        FinanceSummary year
) {}
