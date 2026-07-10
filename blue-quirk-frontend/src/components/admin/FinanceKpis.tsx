"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Percent,
  ShoppingBag,
  Receipt,
  Boxes,
} from "lucide-react";
import StatCard from "@/components/admin/ui/StatCard";
import MiniLineChart, { type ChartPoint } from "@/components/admin/ui/MiniLineChart";
import { FinanceService } from "@/services/finance.service";
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

/**
 * Business performance header for the admin dashboard: Revenue, Gross Profit,
 * Margin %, Orders, Average Order Value and Products Sold for Today / This Month
 * / This Year, plus a profit-over-time chart. All figures come from the
 * admin-only finance API (confidential — never on the storefront).
 */
export default function FinanceKpis() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [series, setSeries] = useState<FinanceTimePoint[]>([]);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const year = new Date().getFullYear();
      const [ov, ts] = await Promise.allSettled([
        FinanceService.overview(),
        FinanceService.timeSeries(`${year}-01-01`, `${year}-12-31`, "MONTH"),
      ]);
      if (cancelled) return;
      if (ov.status === "fulfilled") setOverview(ov.value);
      else setError(true);
      if (ts.status === "fulfilled") setSeries(ts.value);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current: FinanceSummary | null = overview ? overview[period] : null;

  const revenueSeries: ChartPoint[] = useMemo(
    () => series.map((p) => ({ label: p.period, value: p.revenue })),
    [series]
  );
  const profitSeries: ChartPoint[] = useMemo(
    () => series.map((p) => ({ label: p.period, value: p.profit })),
    [series]
  );

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
            value={formatPrice(current.revenue)}
            icon={DollarSign}
            accent="green"
            hint={`Net sales ${formatPrice(current.netSales)}`}
          />
          <StatCard
            label="Gross Profit"
            value={formatPrice(current.grossProfit)}
            icon={TrendingUp}
            accent="blue"
            hint={`Cost ${formatPrice(current.cost)}`}
          />
          <StatCard
            label="Profit Margin"
            value={formatPercent(current.marginPercent)}
            icon={Percent}
            accent="violet"
            hint="Gross profit ÷ revenue"
          />
          <StatCard
            label="Orders"
            value={current.orders}
            icon={ShoppingBag}
            accent="amber"
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

      {/* Revenue & profit over the year */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Revenue over time (this year)
          </h3>
          <MiniLineChart data={revenueSeries} color="#2563eb" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Profit over time (this year)
          </h3>
          <MiniLineChart data={profitSeries} color="#059669" />
        </div>
      </div>
    </div>
  );
}
