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
  onCostChange,
  onPriceChange,
}: {
  cost: number;
  price: number;
  onCostChange: (value: number) => void;
  onPriceChange: (value: number) => void;
}) {
  const margin = grossMargin(price, cost);
  const marginPct = grossMarginPercent(price, cost);
  const negative = margin < 0;

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
