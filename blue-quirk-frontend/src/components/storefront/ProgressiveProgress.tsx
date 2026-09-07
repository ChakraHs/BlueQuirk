"use client";

import { Gift, PartyPopper } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { t } from "@/lib/i18n";
import { progressiveFraction, type ProgressiveState } from "@/lib/progressive";

/**
 * The dedicated multi-item discount progress component for the cart / checkout
 * (spec §7). Consumes the centralized progressive state (from the authoritative
 * quote) — it never computes the discount itself. Dynamically reflects add / remove /
 * quantity changes because the underlying quote re-fetches on cart change.
 */
export default function ProgressiveProgress({
  state,
  lang,
  className = "",
}: {
  state: ProgressiveState;
  lang: string;
  className?: string;
}) {
  const fraction = progressiveFraction(state);

  // Milestone: the customer has reached the configured maximum.
  if (state.maxReached) {
    return (
      <div className={`rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 ${className}`}>
        <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-800">
          <PartyPopper className="size-4" />
          {t(lang, "progressive.maxTitle")}
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          {t(lang, "progressive.maxBody", { amount: formatPrice(state.discount) })}
        </p>
        <Bar fraction={1} tone="emerald" />
      </div>
    );
  }

  const headline = state.applied
    ? t(lang, "progressive.currentUnlocked", { amount: formatPrice(state.discount) })
    : t(lang, "progressive.offerTitle");

  return (
    <div className={`rounded-xl border border-primary/25 bg-primary/[0.04] p-4 ${className}`}>
      <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
        <Gift className="size-4 text-primary" />
        {headline}
      </p>
      <Bar fraction={fraction} tone="primary" />
      <p className="mt-2 text-xs text-gray-600">
        {t(lang, "progressive.addOneMore", { amount: formatPrice(state.nextDiscount) })}
      </p>
    </div>
  );
}

function Bar({ fraction, tone }: { fraction: number; tone: "primary" | "emerald" }) {
  const bg = tone === "emerald" ? "bg-emerald-500" : "bg-primary";
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200/70">
      <div
        className={`h-full rounded-full ${bg} transition-[width] duration-500 ease-out`}
        style={{ width: `${Math.round(fraction * 100)}%` }}
      />
    </div>
  );
}
