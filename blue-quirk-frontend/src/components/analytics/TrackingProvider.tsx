"use client";

import Script from "next/script";
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
 * Behaviour:
 *   • Renders NOTHING (and loads nothing) until the runtime config resolves and
 *     says Meta is active. Fails closed.
 *   • Injects the official Pixel base code via next/script strategy="afterInteractive"
 *     so it NEVER blocks rendering. The snippet defines the `fbq` queue shim
 *     synchronously (calls buffer until the library loads), runs `fbq('init')`
 *     ONCE, and fires the initial PageView.
 *   • Registers the Meta provider with the TrackingService once, and fires a
 *     PageView on each subsequent client-side route change (the first PageView is
 *     the snippet's, so we skip it here to avoid a duplicate).
 *   • Captures first-touch UTM/fbclid attribution on load + navigation.
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
  const { active, pixelId } = resolveMeta(runtime ?? undefined);
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
  // Pixel base snippet itself (right after init), so we skip the initial render
  // here to avoid a duplicate; every later route change fires one PageView.
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

  if (!ready || !active) return null;

  // Official Meta Pixel base code. Defines the `fbq` shim synchronously, then
  // async-injects fbevents.js. next/script defers execution until the page is
  // interactive, so it never blocks first paint. `init` + the initial PageView
  // run exactly once (this component mounts once, high in the tree).
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(pixelId)});
fbq('track', 'PageView');`}
    </Script>
  );
}
