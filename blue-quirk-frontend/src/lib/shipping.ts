"use client";

// Single source of truth for shipping economics on the storefront. The numbers
// (flat fee + free-shipping threshold) come from the backend (`GET /api/shop/config`),
// which also computes the authoritative order totals — so the UI never drifts
// from what the customer is actually charged. Defaults are a safe fallback used
// only until the config loads (or if the request fails offline).
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

export type ShippingConfig = {
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number;
  // When true, free shipping is unlocked by the NUMBER of products in the cart
  // (freeShippingQuantity) instead of the subtotal threshold. The two are mutually
  // exclusive: whichever is active is the one the storefront shows and charges by.
  freeShippingByQuantityEnabled: boolean;
  freeShippingQuantity: number;
  // Whether the checkout coupon block is shown (admin toggle). Not a shipping
  // number, but it rides on the same /shop/config fetch so checkout can gate the
  // coupon input without a second request.
  couponEnabled: boolean;
  // Whether customer reviews are enabled (admin toggle). Rides the same fetch so
  // product cards can gate their rating badge without a second request.
  reviewsEnabled: boolean;
};

export const SHIPPING_DEFAULTS: ShippingConfig = {
  currency: "DH",
  shippingFee: 29,
  freeShippingThreshold: 300,
  freeShippingByQuantityEnabled: false,
  freeShippingQuantity: 2,
  couponEnabled: true,
  reviewsEnabled: false,
};

const CONFIG_URL = `${API_BASE_URL}/shop/config`;

// Module-level cache so every component shares one in-flight request / result.
let cached: ShippingConfig | null = null;
let inFlight: Promise<ShippingConfig> | null = null;

export async function fetchShippingConfig(): Promise<ShippingConfig> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = fetch(CONFIG_URL, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`config ${res.status}`);
      return res.json() as Promise<Partial<ShippingConfig>>;
    })
    .then((data) => {
      cached = {
        currency: data.currency ?? SHIPPING_DEFAULTS.currency,
        shippingFee:
          typeof data.shippingFee === "number" ? data.shippingFee : SHIPPING_DEFAULTS.shippingFee,
        freeShippingThreshold:
          typeof data.freeShippingThreshold === "number"
            ? data.freeShippingThreshold
            : SHIPPING_DEFAULTS.freeShippingThreshold,
        freeShippingByQuantityEnabled: data.freeShippingByQuantityEnabled === true,
        freeShippingQuantity:
          typeof data.freeShippingQuantity === "number" && data.freeShippingQuantity > 0
            ? data.freeShippingQuantity
            : SHIPPING_DEFAULTS.freeShippingQuantity,
        // Shown unless the backend explicitly disables it.
        couponEnabled: data.couponEnabled !== false,
        // Off unless the backend explicitly enables it.
        reviewsEnabled: data.reviewsEnabled === true,
      };
      return cached;
    })
    .catch(() => SHIPPING_DEFAULTS)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Reactive hook: returns defaults immediately, then the backend config. */
export function useShippingConfig(): ShippingConfig {
  const [config, setConfig] = useState<ShippingConfig>(cached ?? SHIPPING_DEFAULTS);

  useEffect(() => {
    let alive = true;
    fetchShippingConfig().then((c) => {
      if (alive) setConfig(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  return config;
}

/**
 * True during the temporary free-shipping campaign: the backend advertises a flat
 * fee of 0, which means shipping is free regardless of subtotal or threshold. The
 * storefront uses this to show a clean "free shipping" message instead of the
 * "spend X more to unlock free shipping" progress UI.
 */
export function isFreeShippingCampaign(config: ShippingConfig): boolean {
  return config.shippingFee <= 0;
}

/**
 * The shipping charged for a cart. Free once the active rule is met: in quantity
 * mode, once the cart holds enough products (itemCount); otherwise once the subtotal
 * reaches the threshold. `itemCount` only matters in quantity mode.
 */
export function computeShipping(
  subtotal: number,
  config: ShippingConfig,
  itemCount = 0
): number {
  if (config.freeShippingByQuantityEnabled) {
    return config.freeShippingQuantity > 0 && itemCount >= config.freeShippingQuantity
      ? 0
      : config.shippingFee;
  }
  if (config.freeShippingThreshold > 0 && subtotal >= config.freeShippingThreshold) {
    return 0;
  }
  return config.shippingFee;
}

/** Which free-shipping rule is currently active (drives the storefront copy). */
export type FreeShippingMode = "campaign" | "quantity" | "threshold" | "disabled";

export type FreeShippingState = {
  /** The active rule. "disabled" = no free-shipping perk is configured. */
  mode: FreeShippingMode;
  /** True once the cart qualifies for free shipping. */
  qualified: boolean;
  /** Progress toward the active goal, 0–100. */
  percent: number;
  // --- Threshold mode ---
  /** MAD still needed to qualify (0 when qualified or not in threshold mode). */
  remaining: number;
  /** The configured subtotal threshold (for display). */
  threshold: number;
  // --- Quantity mode ---
  /** Products still needed to qualify (0 when qualified or not in quantity mode). */
  itemsRemaining: number;
  /** The configured product count that unlocks free shipping. */
  requiredQuantity: number;
};

export function freeShippingState(
  subtotal: number,
  config: ShippingConfig,
  itemCount = 0
): FreeShippingState {
  const base = {
    remaining: 0,
    threshold: config.freeShippingThreshold,
    itemsRemaining: 0,
    requiredQuantity: config.freeShippingQuantity,
  };

  // Free-shipping campaign: every order already ships free (full progress).
  if (isFreeShippingCampaign(config)) {
    return { ...base, mode: "campaign", qualified: true, percent: 100 };
  }

  // Quantity mode: free once the cart holds enough products.
  if (config.freeShippingByQuantityEnabled) {
    const required = config.freeShippingQuantity;
    if (required <= 0) {
      return { ...base, mode: "disabled", qualified: true, percent: 100 };
    }
    const qualified = itemCount >= required;
    const itemsRemaining = qualified ? 0 : required - itemCount;
    const percent = Math.max(0, Math.min(100, (itemCount / required) * 100));
    return { ...base, mode: "quantity", qualified, itemsRemaining, percent };
  }

  // Threshold mode (default).
  const threshold = config.freeShippingThreshold;
  if (threshold <= 0) {
    return { ...base, mode: "disabled", qualified: true, threshold: 0, percent: 100 };
  }
  const qualified = subtotal >= threshold;
  const remaining = qualified ? 0 : Math.max(0, threshold - subtotal);
  const percent = Math.max(0, Math.min(100, (subtotal / threshold) * 100));
  return { ...base, mode: "threshold", qualified, remaining, percent };
}
