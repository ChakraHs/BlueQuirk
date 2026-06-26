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
};

export const SHIPPING_DEFAULTS: ShippingConfig = {
  currency: "DH",
  shippingFee: 29,
  freeShippingThreshold: 300,
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

/** The shipping charged for a given subtotal (0 once the threshold is reached). */
export function computeShipping(subtotal: number, config: ShippingConfig): number {
  if (config.freeShippingThreshold > 0 && subtotal >= config.freeShippingThreshold) {
    return 0;
  }
  return config.shippingFee;
}

export type FreeShippingState = {
  /** True once the subtotal qualifies for free shipping. */
  qualified: boolean;
  /** MAD still needed to qualify (0 when qualified or feature disabled). */
  remaining: number;
  /** Progress toward the threshold, 0–100. */
  percent: number;
  /** The configured threshold (for display). */
  threshold: number;
};

export function freeShippingState(subtotal: number, config: ShippingConfig): FreeShippingState {
  const threshold = config.freeShippingThreshold;
  if (threshold <= 0) {
    return { qualified: true, remaining: 0, percent: 100, threshold: 0 };
  }
  const qualified = subtotal >= threshold;
  const remaining = qualified ? 0 : Math.max(0, threshold - subtotal);
  const percent = Math.max(0, Math.min(100, (subtotal / threshold) * 100));
  return { qualified, remaining, percent, threshold };
}
