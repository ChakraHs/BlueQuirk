import api from "./api";
import type {
  FinanceOverview,
  FinanceSummary,
  FinanceTimePoint,
  ProductFinancialRow,
} from "@/types/finance";

export type ProductRankingMetric = "UNITS" | "PROFIT" | "MARGIN" | "REVENUE";
export type Granularity = "DAY" | "MONTH";

/**
 * Admin-only finance & profit analytics client. Every call goes to
 * /api/admin/finance/** with the bearer token — these figures (cost, profit,
 * margins) are confidential and never exposed to the storefront.
 */
export const FinanceService = {
  /** Today / This Month / This Year KPI summaries in one call. */
  overview: async (): Promise<FinanceOverview> => {
    const { data } = await api.get<FinanceOverview>("/admin/finance/overview");
    return data;
  },

  /** KPI summary for a date range (YYYY-MM-DD, inclusive). */
  summary: async (from?: string, to?: string): Promise<FinanceSummary> => {
    const { data } = await api.get<FinanceSummary>("/admin/finance/summary", {
      params: from && to ? { from, to } : {},
    });
    return data;
  },

  /** Revenue / profit / orders over time (daily or monthly buckets). */
  timeSeries: async (
    from: string,
    to: string,
    granularity: Granularity = "DAY"
  ): Promise<FinanceTimePoint[]> => {
    const { data } = await api.get<FinanceTimePoint[]>(
      "/admin/finance/timeseries",
      { params: { from, to, granularity } }
    );
    return data;
  },

  /** Product rankings: best selling (UNITS), most profitable (PROFIT), lowest margin (MARGIN). */
  topProducts: async (
    metric: ProductRankingMetric = "UNITS",
    limit = 10,
    from?: string,
    to?: string
  ): Promise<ProductFinancialRow[]> => {
    const { data } = await api.get<ProductFinancialRow[]>(
      "/admin/finance/products/top",
      { params: { metric, limit, ...(from && to ? { from, to } : {}) } }
    );
    return data;
  },
};
