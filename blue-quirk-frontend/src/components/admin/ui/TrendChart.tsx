"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice } from "@/lib/money";

export type TrendPoint = { period: string; value: number };

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-07" -> "Jul"; "2026-07-15" -> "15 Jul". Axis tick label. */
function tickLabel(period: string): string {
  const p = period.split("-");
  if (p.length === 2) return MONTHS[Number(p[1]) - 1] ?? period;
  if (p.length === 3) return `${Number(p[2])} ${MONTHS[Number(p[1]) - 1] ?? ""}`.trim();
  return period;
}

/** "2026-07" -> "July 2026"; "2026-07-15" -> "15 July 2026". Tooltip heading. */
function fullLabel(period: string): string {
  const FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
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

type TooltipEntry = { value: number };
function ChartTooltip({
  active,
  payload,
  label,
  color,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  color: string;
}) {
  if (!active || !payload?.length || label == null) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-0.5 text-xs font-medium text-gray-500">{fullLabel(label)}</p>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
        {formatPrice(payload[0].value)}
      </p>
    </div>
  );
}

/**
 * Polished analytics bar chart (recharts): month/day axis, compact currency
 * axis, gridlines, gradient bars, and an interactive hover tooltip — used for the
 * admin dashboard's Revenue / Profit over time. Empty periods simply have no bar
 * (not a blank box), and a zero reference line keeps negative profit readable.
 */
export default function TrendChart({
  data,
  color = "#2563eb",
  height = 240,
}: {
  data: TrendPoint[];
  color?: string;
  height?: number;
}) {
  const gradientId = useId();

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

  const hasSales = data.some((d) => d.value !== 0);
  const hasNegative = data.some((d) => d.value < 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="25%">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </linearGradient>
          </defs>
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
            content={<ChartTooltip color={color} />}
            cursor={{ fill: "rgba(148,163,184,0.12)" }}
          />
          <Bar
            dataKey="value"
            fill={`url(#${gradientId})`}
            radius={[4, 4, 0, 0]}
            maxBarSize={38}
            isAnimationActive
          />
        </BarChart>
      </ResponsiveContainer>

      {!hasSales && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-gray-50/80 px-3 py-1 text-xs text-gray-400">
            No sales recorded yet
          </span>
        </div>
      )}
    </div>
  );
}
