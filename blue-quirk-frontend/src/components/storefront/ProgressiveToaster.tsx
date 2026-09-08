"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Gift, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useCartQuote } from "@/lib/bundle";
import { formatPrice } from "@/lib/money";
import { t } from "@/lib/i18n";

/**
 * Global, non-intrusive toast for the progressive multi-item discount (spec §6).
 * Mounted once (in the storefront Header) it watches the authoritative cart quote and
 * shows a toast ONLY when the unlocked discount actually increases — i.e. right after
 * an eligible add-to-cart. It never fires on page load, refresh, or item removal, so
 * it can't become spammy. Auto-dismisses with a smooth animation; works on mobile
 * (bottom-centered, above the fold, pointer-events isolated).
 */
export default function ProgressiveToaster({ lang }: { lang: string }) {
  const items = useCart();
  const quoteItems = useMemo(
    () => items.map((i) => ({ id: i.id, quantity: i.quantity })),
    [items]
  );
  const { quote } = useCartQuote(quoteItems);

  const prevDiscount = useRef<number | null>(null);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const removeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // No active campaign / no eligible items: keep the baseline in sync so that
    // re-enabling later doesn't spuriously fire, then bail.
    if (!quote || !quote.progressiveEnabled) {
      if (quote) prevDiscount.current = quote.progressiveDiscount ?? 0;
      return;
    }
    const cur = quote.progressiveDiscount ?? 0;
    const prev = prevDiscount.current;
    prevDiscount.current = cur;

    // First observation (initial load / hydration): record, never toast.
    if (prev === null) return;
    if (cur <= prev) return; // removals / quantity drops never nudge

    const title = quote.progressiveMaxReached
      ? t(lang, "progressive.maxTitle")
      : t(lang, "progressive.unlockedTitle", { amount: formatPrice(cur, lang) });
    const body = quote.progressiveMaxReached
      ? t(lang, "progressive.maxBody", { amount: formatPrice(cur, lang) })
      : t(lang, "progressive.addOneMore", { amount: formatPrice(quote.progressiveNextDiscount, lang) });

    setToast({ title, body });
    setVisible(true);
    // NOTE: a `progressive_discount_unlocked` analytics event is intentionally
    // deferred — it needs a matching backend AnalyticsEventType/EventType enum value
    // (see lib/analytics/types.ts) to avoid silently-dropped events. Follow-up.

    clearTimeout(hideTimer.current);
    clearTimeout(removeTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 4000);
    removeTimer.current = setTimeout(() => setToast(null), 4300);
  }, [quote, lang]);

  useEffect(
    () => () => {
      clearTimeout(hideTimer.current);
      clearTimeout(removeTimer.current);
    },
    []
  );

  const dismiss = () => {
    setVisible(false);
    clearTimeout(removeTimer.current);
    removeTimer.current = setTimeout(() => setToast(null), 300);
  };

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4 sm:bottom-6">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-emerald-200 bg-white p-3.5 shadow-lg ring-1 ring-black/5 transition-all duration-300 ease-out ${
          visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Gift size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{toast.title}</p>
          <p className="mt-0.5 text-xs text-gray-600">{toast.body}</p>
        </div>
        <button
          onClick={dismiss}
          aria-label={t(lang, "bundle.close")}
          className="shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
