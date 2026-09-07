"use client";

import { grossMargin, grossMarginPercent, formatPrice, formatPercent } from "@/lib/money";

/**
 * Admin pricing block: Cost Price + Selling Price with a live gross-margin
 * readout (DH and %). Controlled by the parent form. The margin figure is
 * purely informational — the backend recomputes and stores authoritative
 * values — but it updates instantly as either field is edited.
 */
export default function PricingFields({
  cost,
  price,
  compareAtPrice,
  onCostChange,
  onPriceChange,
  onCompareAtChange,
}: {
  cost: number;
  price: number;
  compareAtPrice: number;
  onCostChange: (value: number) => void;
  onPriceChange: (value: number) => void;
  onCompareAtChange: (value: number) => void;
}) {
  const margin = grossMargin(price, cost);
  const marginPct = grossMarginPercent(price, cost);
  const negative = margin < 0;

  // Compare-at (previous) price only counts as a sale when it is above the price.
  const compareValid = compareAtPrice > 0 && compareAtPrice > price && price > 0;
  const compareInvalid = compareAtPrice > 0 && !compareValid;
  const salePercent = compareValid
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-800">Pricing</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Cost Price (DH)
          </label>
          <input
            name="cost"
            type="number"
            step="0.01"
            min="0"
            value={Number.isFinite(cost) ? cost : 0}
            onChange={(e) => onCostChange(Number(e.target.value))}
            placeholder="0.00"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            What you paid per unit. Admin-only — never shown to customers.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Selling Price (DH)
          </label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            value={Number.isFinite(price) ? price : 0}
            onChange={(e) => onPriceChange(Number(e.target.value))}
            placeholder="0.00"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Previous / compare-at price — optional. Shown crossed out on the store
            when it is higher than the selling price; otherwise nothing is shown. */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Previous Price (DH)
            <span className="ml-1 font-normal text-gray-400">· optional</span>
          </label>
          <input
            name="compareAtPrice"
            type="number"
            step="0.01"
            min="0"
            value={compareAtPrice > 0 ? compareAtPrice : ""}
            onChange={(e) => onCompareAtChange(Number(e.target.value) || 0)}
            placeholder="e.g. 249.00"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
          />
          {compareValid ? (
            <p className="mt-1 text-[11px] font-medium text-emerald-600">
              On sale · −{salePercent}% — shown as{" "}
              <span className="text-gray-400 line-through">{formatPrice(compareAtPrice)}</span>{" "}
              {formatPrice(price)}
            </p>
          ) : compareInvalid ? (
            <p className="mt-1 text-[11px] text-amber-600">
              Must be higher than the selling price to show a discount — otherwise it&apos;s hidden.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-gray-400">
              Leave empty for no sale. When set above the price, it shows crossed out.
            </p>
          )}
        </div>
      </div>

      {/* Live gross margin */}
      <div className="mt-4 flex flex-wrap items-center gap-6 rounded-md border border-gray-200 bg-white px-4 py-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400">
            Gross Margin
          </div>
          <div
            className={`text-lg font-semibold ${
              negative ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {formatPrice(margin)}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-400">
            Margin %
          </div>
          <div
            className={`text-lg font-semibold ${
              negative ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {formatPercent(marginPct)}
          </div>
        </div>
        {negative && (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
            Selling below cost
          </span>
        )}
      </div>
    </div>
  );
}
