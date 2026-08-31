"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { API_BASE_URL, metaConfig, toIsoCurrency } from "@/lib/config";
import { createMetaPixelProvider, META_PIXEL_PROVIDER_NAME, setMetaPixelDebug } from "@/lib/tracking/providers/metaPixel";
import {
  configureTracking,
  registerProvider,
  setTrackingDebug,
  trackingService,
  unregisterProvider,
} from "@/lib/tracking/service";
import { captureAttribution } from "@/lib/tracking/attribution";

/** True when the SSR-rendered Meta Pixel base code is present (fbq defined). */
function metaPixelPresent(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as { fbq?: unknown }).fbq === "function";
}

/**
 * Wires the marketing/ads TrackingService into the storefront. It sits alongside —
 * not inside — the native AnalyticsProvider (business metrics), mirroring how
 * ClarityProvider is kept separate.
 *
 * The Pixel BASE CODE (init + initial PageView) is rendered SERVER-SIDE by
 * MetaPixelBase in the [lang] layout, so it lands in the initial HTML (detectable
 * by Meta's tools) and defines `window.fbq` synchronously before hydration. This
 * client component therefore:
 *   • Registers the Meta provider whenever that SSR pixel is present — the single
 *     authoritative "Meta is active" signal. It does NOT wait on its own config
 *     fetch (which would add latency and break if it fails). In dev / when the
 *     admin toggle is off, MetaPixelBase renders nothing, `fbq` is absent, and no
 *     provider is registered (fails closed).
 *   • Fires a PageView on each SUBSEQUENT route change (the first PageView is the
 *     SSR snippet's, so we skip it to avoid a duplicate).
 *   • Captures first-touch UTM/fbclid attribution.
 *   • Refines the event currency from the public shop config (defaults to MAD).
 *   • Renders nothing.
 *
 * Events emitted during hydration before this registration runs (e.g. a product
 * page's ViewContent — child effects run before this parent's) are buffered by
 * the TrackingService and replayed on registration, so none are lost.
 */
export function TrackingProvider() {
  const pathname = usePathname();
  const debug = metaConfig.debug || process.env.NODE_ENV !== "production";

  // Register the Meta provider off the SSR pixel's presence — the authoritative
  // signal that Meta is active — rather than a client fetch. Runs on mount; the
  // TrackingService replays any events buffered before this point.
  useEffect(() => {
    if (!metaPixelPresent()) return;
    setMetaPixelDebug(debug);
    setTrackingDebug(debug);
    registerProvider(createMetaPixelProvider());
    return () => unregisterProvider(META_PIXEL_PROVIDER_NAME);
  }, [debug]);

  // Refine the event currency from the public config (DH → MAD). Until this
  // resolves the service uses its MAD default, which is correct for this store.
  useEffect(() => {
    if (!metaPixelPresent()) return;
    let cancelled = false;
    fetch(`${API_BASE_URL}/shop/config`, { cache: "no-store", credentials: "omit" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { currency?: string }) => {
        if (!cancelled) configureTracking({ currency: toIsoCurrency(d.currency) });
      })
      .catch(() => {
        /* keep the MAD default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // First-touch attribution + SPA PageViews. The FIRST PageView is emitted by the
  // server-rendered base snippet, so skip the initial render to avoid a duplicate;
  // every later route change fires exactly one PageView.
  const firstRun = useRef(true);
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (!metaPixelPresent()) return;
    captureAttribution();
    const url = window.location.pathname + window.location.search;
    if (firstRun.current) {
      firstRun.current = false;
      lastPath.current = url;
      return;
    }
    if (lastPath.current === url) return; // guard re-renders / StrictMode
    lastPath.current = url;
    trackingService.pageView(url);
  }, [pathname]);

  // Renders nothing — the base pixel code is server-rendered (MetaPixelBase).
  return null;
}
