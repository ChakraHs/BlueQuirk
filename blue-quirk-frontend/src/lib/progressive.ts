"use client";

// Storefront helpers for the progressive multi-item discount. The active campaign
// config is fetched once from the backend (display-only, non-secret) and cached at
// module level so every surface shares one request. The backend stays the single
// source of truth: the ACTUAL discount is always recomputed by POST /api/cart/quote
// (see useCartQuote) and at checkout — everything here is for DISPLAY.
//
// This is the one place the frontend derives progressive-discount copy, so no
// component duplicates the formula (spec §18): components consume `progressiveState`
// / `progressiveProductMessage`, they never multiply items × perItem themselves.
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/money";
import { t } from "@/lib/i18n";
import {
  fetchProgressiveConfig,
  type ProgressivePublicConfig,
} from "@/services/progressive.service";
import type { CartQuote } from "@/services/bundle.service";
import type { Product } from "@/types/product";

let cached: ProgressivePublicConfig | null = null;
let loaded = false;
let inFlight: Promise<ProgressivePublicConfig | null> | null = null;

export async function getProgressiveConfigCached(): Promise<ProgressivePublicConfig | null> {
  if (loaded) return cached;
  if (inFlight) return inFlight;
  inFlight = fetchProgressiveConfig()
    .then((cfg) => {
      cached = cfg;
      loaded = true;
      return cfg;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Reactive hook: null immediately, then the active campaign config (or null). */
export function useProgressiveConfig(): ProgressivePublicConfig | null {
  const [cfg, setCfg] = useState<ProgressivePublicConfig | null>(cached);
  useEffect(() => {
    let alive = true;
    getProgressiveConfigCached().then((c) => {
      if (alive) setCfg(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  return cfg;
}

type MinimalProduct = Pick<Product, "id" | "categories">;

/** Whether a product falls within the campaign's configured scope. */
export function isProgressiveEligible(
  config: ProgressivePublicConfig,
  product: MinimalProduct
): boolean {
  switch (config.eligibility) {
    case "ALL_PRODUCTS":
      return true;
    case "SELECTED_PRODUCTS":
      return config.eligibleProductIds.includes(product.id);
    case "CATEGORY": {
      const cats = (product.categories ?? []).map((c) => c.id);
      return cats.some((id) => config.eligibleCategoryIds.includes(id));
    }
    default:
      return false;
  }
}

/**
 * Normalized progressive state for a priced cart, derived from the authoritative
 * quote. All figures come from the backend; this only shapes them for display.
 */
export type ProgressiveState = {
  enabled: boolean;
  applied: boolean;
  discount: number;
  eligibleCount: number;
  perItem: number;
  nextDiscount: number;
  itemsUntilNext: number;
  maxDiscount: number;
  maxReached: boolean;
  currency: string;
};

/** Reads the progressive block off a quote into a display-friendly shape, or null. */
export function progressiveState(quote: CartQuote | null): ProgressiveState | null {
  if (!quote || !quote.progressiveEnabled) return null;
  return {
    enabled: quote.progressiveEnabled,
    applied: quote.progressiveApplied,
    discount: quote.progressiveDiscount,
    eligibleCount: quote.progressiveEligibleCount,
    perItem: quote.progressivePerItem,
    nextDiscount: quote.progressiveNextDiscount,
    itemsUntilNext: quote.progressiveItemsUntilNext,
    maxDiscount: quote.progressiveMaxDiscount,
    maxReached: quote.progressiveMaxReached,
    currency: quote.currency,
  };
}

/** Visual fill fraction (0..1) for the progress bar. */
export function progressiveFraction(state: ProgressiveState): number {
  if (state.maxReached) return 1;
  // With a cap, show real progress toward it. Without a cap, every added item is one
  // step, so reflect "you're partway to the next reward" without ever looking full.
  if (state.maxDiscount > 0) {
    return Math.max(0.06, Math.min(1, state.discount / state.maxDiscount));
  }
  return state.applied ? 0.6 : 0.3;
}

/**
 * The subtle product-page / product-card incentive line for a given product, or null
 * when nothing should show. Uses the current cart state (via the quote) when
 * available so the copy reflects the customer's real progress (spec §5, §8).
 */
export function progressiveProductMessage(args: {
  config: ProgressivePublicConfig | null;
  quote: CartQuote | null;
  eligible: boolean;
  lang: string;
}): string | null {
  const { config, quote, eligible, lang } = args;
  if (!config || !config.displayOnProduct || !eligible) return null;

  const state = progressiveState(quote);

  // Already at the cap — adding more won't increase savings; stay quiet.
  if (state?.maxReached) return null;

  // A discount is already unlocked: adding THIS item lifts it to the next step.
  if (state?.applied && state.nextDiscount > state.discount) {
    return t(lang, "progressive.productIncrease", {
      amount: formatPrice(state.nextDiscount),
    });
  }

  // Otherwise nudge toward the first/next step. Fall back to the per-item value when
  // there is no cart context yet (empty cart / product visited directly).
  const amount = state && state.nextDiscount > 0 ? state.nextDiscount : config.discountPerAdditionalItem;
  if (!(amount > 0)) return null;
  return t(lang, "progressive.productUnlock", { amount: formatPrice(amount) });
}
