"use client";

import type { OrderContribution } from "@/types/finance";
import { formatPrice } from "@/lib/money";

/**
 * Order-list cell for the "Net contribution" column. Shows the per-order
 * profitability at a glance:
 *   • green when positive, red when negative;
 *   • an "Estimated" vs "Realized" tag — realized only once the order is
 *     Delivered (cash collected). Cancelled orders are shown as void and never
 *     count as realized profit;
 *   • a hover tooltip spelling out the full calculation.
 *
 * The figure is a frozen order-time snapshot (revenue + shipping − discount −
 * product cost − delivery − packaging), so it never changes if catalog prices or
 * settings change later.
 */
export default function NetContributionCell({
  contribution,
}: {
  contribution?: OrderContribution;
}) {
  if (!contribution) {
    return <span className="text-gray-300">—</span>;
  }

  const { netContribution, realized, cancelled } = contribution;
  const negative = netContribution < 0;

  const tooltip = [
    "Net contribution =",
    "  product revenue + shipping charged − discount",
    "  − product cost − delivery cost − packaging",
    "",
    `  ${formatPrice(contribution.productRevenue)} revenue`,
    `+ ${formatPrice(contribution.shippingCharged)} shipping`,
    `− ${formatPrice(contribution.discount)} discount`,
    `− ${formatPrice(contribution.productCost)} product cost`,
    `− ${formatPrice(contribution.deliveryCost)} delivery`,
    `− ${formatPrice(contribution.packagingCost)} packaging`,
    `= ${formatPrice(netContribution)}`,
    "",
    cancelled
      ? "Cancelled — not counted as realized profit."
      : realized
      ? "Realized — the order is delivered (cash collected)."
      : "Estimated — realized once the order is delivered.",
  ].join("\n");

  if (cancelled) {
    return (
      <span
        title={tooltip}
        className="inline-flex flex-col items-end gap-0.5 cursor-help"
      >
        <span className="font-semibold text-gray-400 line-through">
          {formatPrice(netContribution)}
        </span>
        <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
          Void
        </span>
      </span>
    );
  }

  return (
    <span
      title={tooltip}
      className="inline-flex flex-col items-end gap-0.5 cursor-help"
    >
      <span
        className={`font-semibold ${negative ? "text-rose-600" : "text-emerald-600"}`}
      >
        {formatPrice(netContribution)}
      </span>
      <span
        className={`rounded-full px-1.5 text-[10px] font-medium uppercase tracking-wide ${
          realized
            ? "bg-emerald-50 text-emerald-600"
            : "bg-amber-50 text-amber-600"
        }`}
      >
        {realized ? "Realized" : "Estimated"}
      </span>
    </span>
  );
}
