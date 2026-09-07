// Single place for price formatting. RedQuirk is a Morocco-based, cash-on-
// delivery store, so prices are shown in Moroccan dirham. The currency label is
// localized: Latin "DH" for fr/en, Arabic "درهم" for ar. `lang` is optional so
// existing (admin/internal) callers keep the default "DH".
const CURRENCY_LABEL: Record<string, string> = { fr: "DH", en: "DH", ar: "درهم" };

export function formatPrice(value: number, lang?: string): string {
  const currency = (lang && CURRENCY_LABEL[lang]) || "DH";
  return `${value.toFixed(2)} ${currency}`;
}

// --- Cost & margin helpers ---------------------------------------------------
// Mirror the backend FinancialCalculationService so the admin UI shows the same
// numbers as the server (which stays the source of truth for stored values).

/** Gross margin in DH: selling price − cost. */
export function grossMargin(price: number, cost: number): number {
  return round2(price - cost);
}

/** Gross margin as a % of the selling price; 0 when price ≤ 0. */
export function grossMarginPercent(price: number, cost: number): number {
  if (price <= 0) return 0;
  return round2(((price - cost) / price) * 100);
}

/** Format a percentage with one decimal, e.g. "42.0%". */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
