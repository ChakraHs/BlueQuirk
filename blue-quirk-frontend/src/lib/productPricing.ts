// Centralized product-pricing display logic. One source of truth for deciding
// whether a product is "on sale" (has a valid previous price) and computing the
// discount %, so every price display (cards, product page, search, related, …)
// behaves identically. This layer is DISPLAY-ONLY — `price` is always the actual
// charged amount; `compareAt` is a reference shown crossed out and never charged.

export interface PriceInfo {
  current: number; // the actual selling price (what the customer pays)
  previous: number | null; // the crossed-out reference, only when a valid sale
  onSale: boolean; // true only when previous is valid (> current, both > 0)
  discountPercent: number; // rounded %, 0 when not on sale
}

/**
 * Resolve how a product's price should be displayed.
 *
 * A previous price is only "valid" when it is strictly greater than the current
 * price and the current price is positive — this enforces the spec's rules:
 *   - compareAt <= price      → not on sale (Case 3: 199 vs 150)
 *   - compareAt === price      → not on sale (Case 4)
 *   - compareAt null/0/absent  → not on sale (Cases 1, 5)
 */
export function priceInfo(price: number, compareAt?: number | null): PriceInfo {
  const current = Number(price) || 0;
  const prev = typeof compareAt === "number" ? compareAt : NaN;
  const onSale = current > 0 && Number.isFinite(prev) && prev > current;
  return {
    current,
    previous: onSale ? prev : null,
    onSale,
    discountPercent: onSale ? Math.round(((prev - current) / prev) * 100) : 0,
  };
}
