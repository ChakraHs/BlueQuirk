"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice } from "@/lib/money";

/** One bucket with all money series for the grouped bars. */
export type GroupedTrendPoint = {
  period: string; // "YYYY-MM" or "YYYY-MM-DD"
  revenue: number;
  profit: number;
  expense: number;
  realProfit: number;
};

/** A named series → the bar's dataKey, colour and legend label. */
export type TrendSeries = {
  key: "revenue" | "profit" | "expense" | "realProfit";
  label: string;
  color: string;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-07" -> "Jul"; "2026-07-15" -> "15 Jul". */
function tickLabel(period: string): string {
  const p = period.split("-");
  if (p.length === 2) return MONTHS[Number(p[1]) - 1] ?? period;
  if (p.length === 3) return `${Number(p[2])} ${MONTHS[Number(p[1]) - 1] ?? ""}`.trim();
  return period;
}

/** "2026-07" -> "July 2026"; "2026-07-15" -> "15 July 2026". */
function fullLabel(period: string): string {
  const p = period.split("-");
  if (p.length === 2) return `${FULL[Number(p[1]) - 1] ?? ""} ${p[0]}`.trim();
  if (p.length === 3) return `${Number(p[2])} ${FULL[Number(p[1]) - 1] ?? ""} ${p[0]}`.trim();
  return period;
}

/** Compact axis numbers: 1500 -> "1.5k", 12000 -> "12k". */
function compact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(v / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${Math.round(v)}`;
}

type TooltipEntry = { dataKey?: string | number; value?: number; color?: string; name?: string };
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length || label == null) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-gray-500">{fullLabel(label)}</p>
      <ul className="space-y-0.5">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center gap-1.5 text-sm">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-gray-500">{entry.name}</span>
            <span className="ml-auto pl-3 font-semibold text-gray-900">
              {formatPrice(entry.value ?? 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Grouped analytics bar chart: one cluster of bars per month (or day), with a
 * bar for each money series — Revenue, Profit and Real profit side by side — so
 * the three trends read against each other at a glance. Compact currency axis,
 * gridlines, a legend, a zero reference line for negative months, and a combined
 * hover tooltip listing every series. Used on the admin dashboard.
 */
export default function GroupedTrendChart({
  data,
  series,
  height = 300,
}: {
  data: GroupedTrendPoint[];
  series: TrendSeries[];
  height?: number;
}) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  const hasNegative = data.some(
    (d) => d.revenue < 0 || d.profit < 0 || d.realProfit < 0
  );

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
          <XAxis
            dataKey="period"
            tickFormatter={tickLabel}
            tickLine={false}
            axisLine={false}
            minTickGap={4}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
          />
          <YAxis
            tickFormatter={compact}
            tickLine={false}
            axisLine={false}
            width={46}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            allowDecimals={false}
          />
          {hasNegative && <ReferenceLine y={0} stroke="#e5e7eb" />}
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "rgba(148,163,184,0.12)" }}
          />
          <Legend
            iconType="circle"
            iconSize={9}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              radius={[3, 3, 0, 0]}
              maxBarSize={26}
              isAnimationActive
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
