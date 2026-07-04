"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  MousePointerClick,
  Repeat,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import {
  AnalyticsService,
  type CountriesResponse,
  type DevicesResponse,
  type OverviewResponse,
  type PageStat,
  type ProductStat,
  type RangeKey,
  type RangeParams,
  type TrafficResponse,
} from "@/services/analytics.service";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
];

const COLORS = ["#2563eb", "#7c3aed", "#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#64748b"];

type Data = {
  overview: OverviewResponse;
  pages: PageStat[];
  products: ProductStat[];
  traffic: TrafficResponse;
  countries: CountriesResponse;
  devices: DevicesResponse;
};

export default function AnalyticsClient() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const params: RangeParams = { range, from, to };
    if (range === "custom" && (!from || !to)) return; // wait for both dates
    setLoading(true);
    setError(false);
    try {
      const [overview, pages, products, traffic, countries, devices] = await Promise.all([
        AnalyticsService.overview(params),
        AnalyticsService.pages(params),
        AnalyticsService.products(params),
        AnalyticsService.traffic(params),
        AnalyticsService.countries(params),
        AnalyticsService.devices(params),
      ]);
      setData({ overview, pages, products, traffic, countries, devices });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [range, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const ov = data?.overview;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Traffic, audience and conversions — self-hosted, no third-party service."
      >
        {ov && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {ov.onlineVisitors} online
          </span>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              range === r.key
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
            }`}
          >
            {r.label}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
        )}
        {loading && <Loader2 className="ml-1 h-4 w-4 animate-spin text-gray-400" />}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          Failed to load analytics. Is the backend running?
        </div>
      )}

      {!data ? (
        <div className="flex h-64 items-center justify-center text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <KpiRow ov={ov!} />
          <TrafficOverview ov={ov!} />
          <VisitsChart ov={ov!} />
          <SalesVsVisits ov={ov!} />

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <DonutCard title="Traffic sources" data={data.traffic.referrers} />
            <DonutCard title="Devices" data={data.devices.devices} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <TopPages pages={data.pages} />
            <Journeys paths={data.traffic.topPaths} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <BreakdownCard title="Browsers" data={data.devices.browsers} />
            <BreakdownCard title="Operating systems" data={data.devices.os} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <BreakdownCard title="Countries" data={data.countries.countries} empty="No geo data (GeoLite2 database not installed)." />
            <BreakdownCard title="Screen resolutions" data={data.devices.screens} />
          </div>

          <TopProducts products={data.products} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------- KPI cards ------------------------------- */

function KpiRow({ ov }: { ov: OverviewResponse }) {
  const cards = [
    { label: "Total visits", value: ov.totalVisits.toLocaleString(), growth: ov.visitsGrowthPct, icon: TrendingUp },
    { label: "Unique visitors", value: ov.uniqueVisitors.toLocaleString(), icon: Users },
    { label: "Returning visitors", value: ov.returningVisitors.toLocaleString(), icon: Repeat },
    { label: "Avg. session duration", value: formatDuration(ov.avgSessionSeconds), icon: Timer },
    { label: "Bounce rate", value: `${ov.bounceRate.toFixed(1)}%`, icon: MousePointerClick },
    { label: "Conversion rate", value: `${ov.conversionRate.toFixed(1)}%`, icon: Activity },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{c.label}</span>
            <c.icon size={16} className="text-gray-300" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{c.value}</div>
          {typeof c.growth === "number" && <Growth pct={c.growth} />}
        </div>
      ))}
    </div>
  );
}

function Growth({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <div className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-600" : "text-rose-600"}`}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(pct).toFixed(1)}% vs prev. period
    </div>
  );
}

function TrafficOverview({ ov }: { ov: OverviewResponse }) {
  const t = ov.traffic;
  const items = [
    { label: "Today", value: t.today },
    { label: "Yesterday", value: t.yesterday },
    { label: "This week", value: t.thisWeek },
    { label: "This month", value: t.thisMonth },
    { label: "Last month", value: t.lastMonth },
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{i.label}</div>
          <div className="mt-1 text-xl font-bold text-gray-900">{i.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- charts --------------------------------- */

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function VisitsChart({ ov }: { ov: OverviewResponse }) {
  return (
    <div className="mt-6">
      <Card title="Visits & unique visitors">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={ov.series} margin={{ left: -20, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="gVisits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gUniq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={shortDay} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} width={44} />
            <Tooltip contentStyle={TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="visits" name="Visits" stroke="#2563eb" fill="url(#gVisits)" strokeWidth={2} />
            <Area type="monotone" dataKey="uniques" name="Unique" stroke="#7c3aed" fill="url(#gUniq)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function SalesVsVisits({ ov }: { ov: OverviewResponse }) {
  return (
    <div className="mt-6">
      <Card title="Sales vs visits">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={ov.series} margin={{ left: -20, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={shortDay} minTickGap={24} />
            <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} width={44} />
            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} width={44} />
            <Tooltip contentStyle={TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="r" dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
            <Line yAxisId="l" type="monotone" dataKey="visits" name="Visits" stroke="#2563eb" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function DonutCard({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  return (
    <Card title={title}>
      {data.length === 0 ? (
        <Empty />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function BreakdownCard({ title, data, empty }: { title: string; data: { label: string; count: number }[]; empty?: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <Card title={title}>
      {data.length === 0 ? (
        <Empty text={empty} />
      ) : (
        <ul className="space-y-2.5">
          {data.slice(0, 8).map((d) => (
            <li key={d.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="truncate text-gray-700">{d.label}</span>
                <span className="font-medium text-gray-500">{d.count.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TopPages({ pages }: { pages: PageStat[] }) {
  return (
    <Card title="Most viewed pages">
      {pages.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="pb-2 font-medium">Page</th>
                <th className="pb-2 text-right font-medium">Views</th>
                <th className="pb-2 text-right font-medium">Unique</th>
                <th className="pb-2 text-right font-medium">Bounce</th>
                <th className="pb-2 text-right font-medium">Exit</th>
              </tr>
            </thead>
            <tbody>
              {pages.slice(0, 10).map((p) => (
                <tr key={p.path} className="border-b border-gray-50">
                  <td className="max-w-[220px] truncate py-2 text-gray-700" title={p.path}>{p.path}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{p.views.toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-500">{p.uniqueViews.toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-500">{p.bounceRate.toFixed(0)}%</td>
                  <td className="py-2 text-right text-gray-500">{p.exitRate.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Journeys({ paths }: { paths: { path: string; count: number }[] }) {
  const max = Math.max(1, ...paths.map((p) => p.count));
  return (
    <Card title="Most frequent journeys">
      {paths.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-2.5">
          {paths.map((p) => (
            <li key={p.path}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="truncate text-gray-700">{p.path}</span>
                <span className="font-medium text-gray-500">{p.count}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${(p.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TopProducts({ products }: { products: ProductStat[] }) {
  return (
    <div className="mt-6">
      <Card title="Product performance">
        {products.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 text-right font-medium">Views</th>
                  <th className="pb-2 text-right font-medium">Cart</th>
                  <th className="pb-2 text-right font-medium">Buy Now</th>
                  <th className="pb-2 text-right font-medium">Wishlist</th>
                  <th className="pb-2 text-right font-medium">Purchases</th>
                  <th className="pb-2 text-right font-medium">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 15).map((p) => (
                  <tr key={p.productId} className="border-b border-gray-50">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-gray-100" />
                        )}
                        <span className="max-w-[180px] truncate text-gray-700">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900">{p.views}</td>
                    <td className="py-2 text-right text-gray-500">{p.addToCart}</td>
                    <td className="py-2 text-right text-gray-500">{p.buyNow}</td>
                    <td className="py-2 text-right text-gray-500">{p.wishlist}</td>
                    <td className="py-2 text-right text-gray-500">{p.purchases}</td>
                    <td className="py-2 text-right font-medium text-emerald-600">{p.conversionRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* -------------------------------- helpers -------------------------------- */

const TOOLTIP = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
} as const;

function Empty({ text }: { text?: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-center text-sm text-gray-400">
      {text || "No data for this period."}
    </div>
  );
}

function shortDay(v: string) {
  // "2026-07-04" -> "04/07"
  const [, m, d] = v.split("-");
  return d && m ? `${d}/${m}` : v;
}

function formatDuration(seconds: number) {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}
