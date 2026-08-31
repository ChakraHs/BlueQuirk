"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL, metaConfig, resolveMeta, toIsoCurrency, type MetaRuntime } from "@/lib/config";
import { createMetaPixelProvider, META_PIXEL_PROVIDER_NAME, setMetaPixelDebug } from "@/lib/tracking/providers/metaPixel";
import {
  configureTracking,
  registerProvider,
  setTrackingDebug,
  trackingService,
  unregisterProvider,
} from "@/lib/tracking/service";
import { captureAttribution } from "@/lib/tracking/attribution";

/**
 * Wires the marketing/ads TrackingService into the storefront and loads the Meta
 * Pixel (browser Pixel only — no Conversions API in this phase). It sits
 * alongside — not inside — the native AnalyticsProvider, which remains the sole
 * source of business metrics, mirroring how ClarityProvider is kept separate.
 *
 * The enable toggle + Pixel ID are controlled at RUNTIME from the admin
 * dashboard: this component reads them from the public /api/shop/config endpoint
 * (StoreSettings). The NEXT_PUBLIC_META_* env vars are only a fallback (used if
 * that request fails) and the development gate — see resolveMeta().
 *
 * The Pixel BASE CODE (init + initial PageView) is rendered SERVER-SIDE by
 * MetaPixelBase in the [lang] layout, so it lands in the initial HTML and is
 * detectable by Meta's tools. This client component does NOT inject the base code
 * (that would double-init); it complements the SSR snippet:
 *   • Registers the Meta provider with the TrackingService (so ViewContent /
 *     AddToCart / InitiateCheckout / Purchase dispatch), once, when active.
 *   • Fires a PageView on each subsequent client-side route change (the first
 *     PageView is the SSR snippet's, so we skip it here to avoid a duplicate).
 *   • Captures first-touch UTM/fbclid attribution on load + navigation.
 *   • Renders nothing. Fails closed when config says Meta is inactive.
 */
export function TrackingProvider() {
  const pathname = usePathname();

  // Runtime config from the admin dashboard. `undefined` = still loading;
  // `null` = the request failed, so fall back to the env vars.
  const [runtime, setRuntime] = useState<MetaRuntime | null | undefined>(undefined);
  const [currency, setCurrency] = useState<string>("MAD");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/shop/config`, { cache: "no-store", credentials: "omit" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { metaTrackingEnabled?: boolean; metaPixelId?: string | null; currency?: string }) => {
        if (cancelled) return;
        setRuntime({ enabled: d.metaTrackingEnabled === true, pixelId: d.metaPixelId ?? "" });
        setCurrency(toIsoCurrency(d.currency));
      })
      .catch(() => {
        if (!cancelled) setRuntime(null); // fall back to env
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = runtime !== undefined;
  const { active } = resolveMeta(runtime ?? undefined);
  const debug = metaConfig.debug || process.env.NODE_ENV !== "production";

  // Register the Meta provider + configure the service once tracking is active.
  useEffect(() => {
    if (!ready || !active) return;
    setMetaPixelDebug(debug);
    setTrackingDebug(debug);
    configureTracking({ currency });
    registerProvider(createMetaPixelProvider());
    return () => {
      // Toggled off / unmounted: stop dispatching to Meta.
      unregisterProvider(META_PIXEL_PROVIDER_NAME);
    };
  }, [ready, active, currency, debug]);

  // Capture campaign attribution (first-touch) on load and on navigation — a
  // deep link from an ad may land on any route.
  useEffect(() => {
    if (!ready || !active) return;
    captureAttribution();
  }, [ready, active, pathname]);

  // Fire PageView on SPA route changes. The FIRST PageView is emitted by the
  // server-rendered base snippet (right after init), so we skip the initial
  // render here to avoid a duplicate; every later route change fires one PageView.
  const firstRun = useRef(true);
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !active) return;
    const url = typeof window !== "undefined" ? window.location.pathname + window.location.search : pathname;
    if (firstRun.current) {
      firstRun.current = false;
      lastPath.current = url;
      return;
    }
    if (lastPath.current === url) return; // guard re-renders / StrictMode
    lastPath.current = url;
    trackingService.pageView(url);
  }, [ready, active, pathname]);

  // Renders nothing — the base pixel code is server-rendered (MetaPixelBase).
  return null;
}
