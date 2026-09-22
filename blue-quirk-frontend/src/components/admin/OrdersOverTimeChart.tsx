"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import {
  OrderService,
  type OrderTimeseries,
  type OrderTimeseriesBucket,
} from "@/services/order.service";

// The status series the chart can plot. "all" is the total; the rest map 1:1 to
// the order lifecycle statuses returned by the backend.
type SeriesKey = "all" | "confirmed" | "shipped" | "delivered" | "cancelled" | "pending";

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "all", label: "All", color: "#0f172a" },
  { key: "confirmed", label: "Confirmed", color: "#3b82f6" },
  { key: "shipped", label: "Shipped", color: "#8b5cf6" },
  { key: "delivered", label: "Delivered", color: "#10b981" },
  { key: "cancelled", label: "Cancelled", color: "#f43f5e" },
  { key: "pending", label: "Pending", color: "#f59e0b" },
];

const RANGES: { key: string; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
];

const GRANULARITIES: { key: string; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
];

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

/** "2026-07" -> "July 2026"; "2026-07-15" -> "15 July 2026" (week: "Week of …"). */
function fullLabel(period: string, granularity: string): string {
  const p = period.split("-");
  let base = period;
  if (p.length === 2) base = `${FULL[Number(p[1]) - 1] ?? ""} ${p[0]}`.trim();
  else if (p.length === 3) base = `${Number(p[2])} ${FULL[Number(p[1]) - 1] ?? ""} ${p[0]}`.trim();
  return granularity === "week" ? `Week of ${base}` : base;
}

type TooltipEntry = { dataKey?: string | number; value?: number; color?: string; name?: string };

function ChartTooltip({
  active,
  payload,
  label,
  granularity,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  granularity: string;
}) {
  if (!active || !payload?.length || label == null) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-gray-500">{fullLabel(label, granularity)}</p>
      <ul className="space-y-0.5">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center gap-1.5 text-sm">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-gray-500">{entry.name}</span>
            <span className="ml-auto pl-3 font-semibold text-gray-900">{entry.value ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Orders-over-time chart for the admin dashboard. Self-contained: it owns its
 * filters (date range 7/30/90 days · this year · custom, and day/week/month
 * grouping), fetches the zero-filled server series, and lets the admin toggle the
 * status lines (all / confirmed / shipped / delivered / cancelled / pending). Uses
 * the same recharts + Tailwind conventions as the finance charts; exact values are
 * shown in the hover tooltip.
 */
export default function OrdersOverTimeChart() {
  const [range, setRange] = useState("30d");
  const [granularity, setGranularity] = useState("day");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [active, setActive] = useState<Set<SeriesKey>>(
    new Set<SeriesKey>(["all", "delivered", "cancelled"])
  );
  const [data, setData] = useState<OrderTimeseries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Custom range only fires once both ends are chosen.
    if (range === "custom" && (!from || !to)) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    OrderService.getTimeseries({
      range,
      granularity,
      from: range === "custom" ? from : undefined,
      to: range === "custom" ? to : undefined,
    })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, granularity, from, to]);

  const toggle = (key: SeriesKey) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const total = useMemo(
    () => (data ? data.buckets.reduce((n, b) => n + b.all, 0) : 0),
    [data]
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Orders over time</h2>
          <p className="text-xs text-gray-400">
            {total} order{total === 1 ? "" : "s"} in the selected period
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Grouping */}
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500"
            aria-label="Grouping"
          >
            {GRANULARITIES.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
          {/* Date range */}
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  range === r.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {range === "custom" && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <label className="flex items-center gap-1">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex items-center gap-1">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 outline-none focus:border-blue-500"
            />
          </label>
        </div>
      )}

      {/* Status series toggles */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SERIES.map((s) => {
          const on = active.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                on ? "border-gray-300 bg-white text-gray-700" : "border-gray-200 bg-gray-50 text-gray-400"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: on ? s.color : "#cbd5e1" }}
              />
              {s.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex h-[300px] items-center justify-center text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
          Unable to load the chart.
        </div>
      ) : !data || data.buckets.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
          No orders in this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data.buckets as OrderTimeseriesBucket[]}
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
            <XAxis
              dataKey="period"
              tickFormatter={tickLabel}
              tickLine={false}
              axisLine={false}
              minTickGap={16}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={32}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
            />
            <Tooltip
              content={<ChartTooltip granularity={granularity} />}
              cursor={{ stroke: "#e5e7eb" }}
            />
            {SERIES.filter((s) => active.has(s.key)).map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                isAnimationActive
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
