"use client";

import { Gift, PartyPopper, Plus } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { t } from "@/lib/i18n";
import type { ProgressiveState } from "@/lib/progressive";

/**
 * Multi-item discount incentive for the cart / checkout. Unlike the old progress
 * bar, this reads as a clear, premium reward callout: it states the discount
 * already unlocked and — crucially — how much MORE the customer earns for each
 * additional item (per-item value), so the incentive to add one more is obvious.
 * Consumes the centralized progressive state (from the authoritative quote); it
 * never computes a discount itself.
 */
export default function ProgressiveIncentive({
  state,
  lang,
  className = "",
}: {
  state: ProgressiveState;
  lang: string;
  className?: string;
}) {
  // Milestone: the customer has reached the configured maximum — celebrate, and
  // stop nudging (adding more won't increase savings).
  if (state.maxReached) {
    return (
      <div className={`flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 ${className}`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <PartyPopper className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-800">{t(lang, "progressive.maxTitle")}</p>
          <p className="mt-0.5 text-xs text-emerald-700">
            {t(lang, "progressive.maxBody", { amount: formatPrice(state.discount) })}
          </p>
        </div>
      </div>
    );
  }

  // Per-item value: exactly how much each additional eligible item unlocks. This
  // is the “add one more and get X” hook the customer responds to.
  const perItem = state.perItem > 0 ? state.perItem : Math.max(0, state.nextDiscount - state.discount);

  return (
    <div className={`flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.05] p-3.5 ${className}`}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Gift className="size-[18px]" />
      </span>
      <div className="min-w-0">
        {state.applied ? (
          <p className="text-sm font-bold text-emerald-700">
            {t(lang, "progressive.currentUnlocked", { amount: formatPrice(state.discount) })}
          </p>
        ) : (
          <p className="text-sm font-bold text-gray-900">{t(lang, "progressive.offerTitle")}</p>
        )}
        {perItem > 0 && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-medium text-gray-600">
            <Plus className="size-3.5 text-primary" />
            {t(lang, "progressive.perItemNudge", { amount: formatPrice(perItem) })}
          </p>
        )}
      </div>
    </div>
  );
}
