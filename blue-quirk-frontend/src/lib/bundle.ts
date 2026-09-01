"use client";

// Storefront helpers for the automatic quantity-bundle offers. The active offers
// are fetched once from the backend (display-only, non-secret) and cached at
// module level so every product card / cart shares one request. The backend stays
// the single source of truth: the real discount is always recomputed by
// `POST /api/cart/quote` and at checkout — everything here is for DISPLAY.
import { useEffect, useMemo, useState } from "react";
import {
  fetchActiveBundles,
  fetchCartQuote,
  type CartQuote,
  type PublicBundleOffer,
} from "@/services/bundle.service";
import type { Product } from "@/types/product";

let cached: PublicBundleOffer[] | null = null;
let inFlight: Promise<PublicBundleOffer[]> | null = null;

export async function getActiveBundlesCached(): Promise<PublicBundleOffer[]> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = fetchActiveBundles()
    .then((offers) => {
      cached = offers;
      return offers;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Reactive hook: [] immediately, then the backend's active offers. */
export function useActiveBundles(): PublicBundleOffer[] {
  const [offers, setOffers] = useState<PublicBundleOffer[]>(cached ?? []);
  useEffect(() => {
    let alive = true;
    getActiveBundlesCached().then((o) => {
      if (alive) setOffers(o);
    });
    return () => {
      alive = false;
    };
  }, []);
  return offers;
}

export type QuoteLine = { id: number; quantity: number };

/**
 * Reactively prices a cart on the backend (authoritative subtotal + automatic
 * bundle + optional coupon). Debounced and keyed on the cart contents + coupon so
 * it re-fetches only when something that affects price changes. Returns null until
 * the first result arrives (callers fall back to a client-side subtotal).
 */
export function useCartQuote(
  items: QuoteLine[],
  opts: { couponCode?: string; email?: string } = {}
): { quote: CartQuote | null; loading: boolean } {
  const { couponCode, email } = opts;
  const key = useMemo(
    () =>
      JSON.stringify({
        items: items.map((i) => [i.id, i.quantity]),
        couponCode: couponCode ?? null,
        email: email ?? null,
      }),
    [items, couponCode, email]
  );

  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }
    let alive = true;
    setLoading(true);
    const handle = setTimeout(() => {
      fetchCartQuote(
        items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        { couponCode, email }
      )
        .then((q) => {
          if (alive) setQuote(q);
        })
        .catch(() => {
          if (alive) setQuote(null);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { quote, loading };
}

type MinimalProduct = Pick<Product, "id" | "categories">;

/** Whether a product falls within an offer's configured scope. */
export function isProductEligible(offer: PublicBundleOffer, product: MinimalProduct): boolean {
  switch (offer.eligibility) {
    case "ALL_PRODUCTS":
      return true;
    case "SELECTED_PRODUCTS":
      return offer.eligibleProductIds.includes(product.id);
    case "CATEGORY": {
      const cats = (product.categories ?? []).map((c) => c.id);
      return cats.some((id) => offer.eligibleCategoryIds.includes(id));
    }
    default:
      return false;
  }
}

/**
 * The best offer to display on a product page for this product: the first active,
 * product-page-enabled offer the product is eligible for (offers arrive sorted by
 * priority). Returns null when none apply.
 */
export function offerForProductPage(
  offers: PublicBundleOffer[],
  product: MinimalProduct
): PublicBundleOffer | null {
  return offers.find((o) => o.displayOnProduct && isProductEligible(o, product)) ?? null;
}

/** The best active offer this product is eligible for (any surface). */
export function offerForProduct(
  offers: PublicBundleOffer[],
  product: MinimalProduct
): PublicBundleOffer | null {
  return offers.find((o) => isProductEligible(o, product)) ?? null;
}

export type BundlePreview = {
  /** Number of items in one complete set. */
  quantity: number;
  /** Normal price of the set at this unit price (quantity × unitPrice). */
  normal: number;
  /** The price the customer pays for the set (display estimate). */
  setPrice: number;
  /** Amount saved on the set (normal − setPrice), never negative. */
  save: number;
};

/**
 * Display estimate of one complete set built from items at {@code unitPrice}. This
 * mirrors the engine for a single same-priced set (the common storefront case);
 * the authoritative amount always comes from the backend quote.
 */
export function previewSet(offer: PublicBundleOffer, unitPrice: number): BundlePreview {
  const quantity = offer.minQuantity;
  const normal = round(unitPrice * quantity);
  let setPrice = normal;
  switch (offer.pricingMethod) {
    case "FIXED_BUNDLE_PRICE":
      setPrice = offer.bundleValue;
      break;
    case "PERCENTAGE_DISCOUNT":
      setPrice = round(normal * (1 - clampPct(offer.bundleValue) / 100));
      break;
    case "FIXED_AMOUNT_DISCOUNT":
      setPrice = round(Math.max(0, normal - offer.bundleValue));
      break;
  }
  const save = round(Math.max(0, normal - setPrice));
  return { quantity, normal, setPrice, save };
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
