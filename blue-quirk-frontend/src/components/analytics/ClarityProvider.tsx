"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL, resolveClarity, type ClarityRuntime } from "@/lib/config";
import { clarityIdentify } from "@/lib/analytics/clarity";
import { getAuthUser } from "@/lib/auth";

/**
 * Loads Microsoft Clarity (session replay + heatmaps + UX diagnostics only) on
 * the storefront. It sits alongside — not inside — the native AnalyticsProvider,
 * which remains the sole source of business metrics.
 *
 * The enable toggle + project id are controlled at RUNTIME from the admin
 * dashboard: this component reads them from the public /api/shop/config endpoint
 * (StoreSettings). The NEXT_PUBLIC_CLARITY_* env vars are only a fallback (used
 * if that request fails) and the development gate — see resolveClarity().
 *
 * Behaviour:
 *   • Renders NOTHING (and loads nothing) until the runtime config resolves and
 *     says Clarity is active. Fails closed.
 *   • Injects the official loader via next/script strategy="afterInteractive" —
 *     never blocks rendering, no layout shift, no hydration warnings.
 *   • Identifies an authenticated visitor by INTERNAL user id only, once known,
 *     re-checking on navigation to catch login/logout. Anonymous visitors are
 *     never identified.
 */
export function ClarityProvider() {
  const pathname = usePathname();
  const identifiedId = useRef<string | null>(null);

  // Runtime config from the admin dashboard. `undefined` = still loading;
  // `null` = the request failed, so fall back to the env vars.
  const [runtime, setRuntime] = useState<ClarityRuntime | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/shop/config`, { cache: "no-store", credentials: "omit" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { clarityEnabled?: boolean; clarityProjectId?: string | null }) => {
        if (!cancelled) {
          setRuntime({ enabled: d.clarityEnabled === true, projectId: d.clarityProjectId ?? "" });
        }
      })
      .catch(() => {
        if (!cancelled) setRuntime(null); // fall back to env
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = runtime !== undefined;
  const { active, projectId } = resolveClarity(runtime ?? undefined);

  useEffect(() => {
    if (!ready || !active) return;
    const id = getAuthUser()?.id ?? null;
    if (!id || identifiedId.current === id) return;
    identifiedId.current = id;
    clarityIdentify(id);
  }, [ready, active, pathname]);

  if (!ready || !active) return null;

  // Official Clarity loader: defines the window.clarity queue shim synchronously,
  // then async-injects the external tag. next/script defers execution until the
  // page is interactive.
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script",${JSON.stringify(projectId)});`}
    </Script>
  );
}
