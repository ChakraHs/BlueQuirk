// Admin analytics API client. Read-only endpoints backing the dashboard; all take
// the same range filter. Uses the shared axios client so the admin bearer token
// is attached — /api/admin/analytics/** is admin-only on the backend.
import api from "./api";

export type RangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "year"
  | "custom";

export type RangeParams = { range: RangeKey; from?: string; to?: string };

export type LabelCount = { label: string; count: number };

export type OverviewResponse = {
  totalVisits: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  pageViews: number;
  avgSessionSeconds: number;
  bounceRate: number;
  conversionRate: number;
  visitsGrowthPct: number;
  onlineVisitors: number;
  traffic: {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
    growthPct: number;
  };
  series: Array<{
    day: string;
    visits: number;
    uniques: number;
    pageViews: number;
    orders: number;
    revenue: number;
  }>;
};

export type PageStat = {
  path: string;
  pageType: string;
  views: number;
  uniqueViews: number;
  avgTimeSeconds: number;
  bounceRate: number;
  exitRate: number;
};

export type ProductStat = {
  productId: number;
  name: string;
  image: string | null;
  views: number;
  uniqueViews: number;
  addToCart: number;
  buyNow: number;
  checkoutStarts: number;
  purchases: number;
  wishlist: number;
  conversionRate: number;
};

export type TrafficResponse = {
  referrers: LabelCount[];
  topPaths: Array<{ path: string; count: number }>;
};

export type CountriesResponse = { countries: LabelCount[]; cities: LabelCount[] };

export type DevicesResponse = {
  devices: LabelCount[];
  browsers: LabelCount[];
  os: LabelCount[];
  screens: LabelCount[];
};

function qs(p: RangeParams): string {
  const params = new URLSearchParams({ range: p.range });
  if (p.range === "custom") {
    if (p.from) params.set("from", p.from);
    if (p.to) params.set("to", p.to);
  }
  return params.toString();
}

async function get<T>(path: string, p: RangeParams): Promise<T> {
  // Axios has no HTTP cache by default, so numbers stay as fresh as the old
  // fetch(cache: "no-store") behaviour.
  const res = await api.get<T>(`/admin/analytics/${path}?${qs(p)}`);
  return res.data;
}

export const AnalyticsService = {
  overview: (p: RangeParams) => get<OverviewResponse>("overview", p),
  pages: (p: RangeParams) => get<PageStat[]>("pages", p),
  products: (p: RangeParams) => get<ProductStat[]>("products", p),
  traffic: (p: RangeParams) => get<TrafficResponse>("traffic", p),
  countries: (p: RangeParams) => get<CountriesResponse>("countries", p),
  devices: (p: RangeParams) => get<DevicesResponse>("devices", p),
};
