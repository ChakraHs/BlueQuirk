"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Percent,
  ShoppingBag,
  Receipt,
  Boxes,
  Wallet,
  PiggyBank,
} from "lucide-react";
import StatCard from "@/components/admin/ui/StatCard";
import GroupedTrendChart, {
  type GroupedTrendPoint,
  type TrendSeries,
} from "@/components/admin/ui/GroupedTrendChart";
import { FinanceService } from "@/services/finance.service";
import type { Granularity } from "@/services/finance.service";
import type {
  FinanceOverview,
  FinanceSummary,
  FinanceTimePoint,
} from "@/types/finance";
import { formatPrice, formatPercent } from "@/lib/money";

type Period = "today" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  month: "This Month",
  year: "This Year",
};

const CHART_GRANULARITIES: { value: Granularity; label: string; title: string }[] = [
  { value: "WEEK", label: "Weekly", title: "by week" },
  { value: "HALF_MONTH", label: "Twice monthly", title: "twice monthly" },
  { value: "MONTH", label: "Monthly", title: "by month" },
];

/**
 * Business performance header for the admin dashboard: Revenue, Net Profit
 * (order total − product cost − real shipping cost), Margin %, Orders, Average
 * Order Value and Products Sold for Today / This Month / This Year, plus a
 * profit-over-time chart. All figures come from the admin-only finance API
 * (confidential — never on the storefront).
 */
export default function FinanceKpis() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [series, setSeries] = useState<FinanceTimePoint[]>([]);
  const [period, setPeriod] = useState<Period>("month");
  const [granularity, setGranularity] = useState<Granularity>("WEEK");
  const [loading, setLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ov = await FinanceService.overview().then(
        (value) => ({ status: "fulfilled" as const, value }),
        () => ({ status: "rejected" as const })
      );
      if (cancelled) return;
      if (ov.status === "fulfilled") setOverview(ov.value);
      else setError(true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const year = new Date().getFullYear();
    setSeriesLoading(true);
    FinanceService.timeSeries(`${year}-01-01`, `${year}-12-31`, granularity)
      .then((value) => {
        if (!cancelled) setSeries(value);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setSeriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [granularity]);

  const current: FinanceSummary | null = overview ? overview[period] : null;

  // One clustered bar chart with every money series per month, so revenue,
  // profit (before expenses), expenses and real profit (after expenses) read
  // against each other at a glance instead of living in disconnected charts.
  const trendData: GroupedTrendPoint[] = useMemo(
    () =>
      series.map((p) => ({
        period: p.period,
        revenue: p.collected,
        profit: p.profit,
        expense: p.expenses,
        realProfit: p.realProfit,
      })),
    [series]
  );
  const trendSeries: TrendSeries[] = [
    { key: "revenue", label: "Revenue", color: "#2563eb" },
    { key: "profit", label: "Profit", color: "#f59e0b" },
    { key: "expense", label: "Expenses", color: "#dc2626" },
    { key: "realProfit", label: "Real profit", color: "#059669" },
  ];
  const chartGranularity = CHART_GRANULARITIES.find((item) => item.value === granularity)!;

  if (error) {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-700">
        Financial analytics are unavailable right now.
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Business performance
        </h2>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          {(["today", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                period === p
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading || !current ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[104px] animate-pulse rounded-xl border border-gray-200 bg-gray-100"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Revenue"
            value={formatPrice(current.collected)}
            icon={DollarSign}
            accent="green"
            hint={`Incl. shipping · goods ${formatPrice(current.revenue)}`}
          />
          <StatCard
            label="Net Profit"
            value={formatPrice(current.netProfit)}
            icon={TrendingUp}
            accent="blue"
            hint={`Cost ${formatPrice(current.cost)} · Real shipping ${formatPrice(current.realShippingCost)} · Packaging ${formatPrice(current.packagingCost)}`}
          />
          <StatCard
            label="Real Profit"
            value={formatPrice(current.realProfit)}
            icon={PiggyBank}
            accent="green"
            hint={`After expenses (${formatPrice(current.expenses)}) · net profit − expenses`}
          />
          <StatCard
            label="Expenses"
            value={formatPrice(current.expenses)}
            icon={Wallet}
            accent="rose"
            hint="Ads, hosting, UGC…"
          />
          <StatCard
            label="Profit Margin"
            value={formatPercent(current.collected > 0 ? (current.realProfit / current.collected) * 100 : 0)}
            icon={Percent}
            accent="violet"
            hint="Real profit ÷ revenue (after all costs)"
          />
          <StatCard
            label="Orders"
            value={current.totalOrders}
            icon={ShoppingBag}
            accent="amber"
            hint={`${current.orders} delivered`}
          />
          <StatCard
            label="Average Order Value"
            value={formatPrice(current.averageOrderValue)}
            icon={Receipt}
            accent="slate"
          />
          <StatCard
            label="Products Sold"
            value={current.productsSold}
            icon={Boxes}
            accent="rose"
          />
        </div>
      )}

      {/* Revenue, profit & real profit over the year — grouped bars per month */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Revenue, profit, expenses &amp; real profit {chartGranularity.title} (this year)
          </h3>
          <div className="inline-flex w-fit rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {CHART_GRANULARITIES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setGranularity(item.value)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  granularity === item.value
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {seriesLoading ? (
          <div className="h-[300px] animate-pulse rounded-lg bg-gray-100" />
        ) : (
          <GroupedTrendChart data={trendData} series={trendSeries} />
        )}
      </div>
    </div>
  );
}
