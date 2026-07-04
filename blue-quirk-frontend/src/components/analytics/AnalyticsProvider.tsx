"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { track } from "@/lib/analytics/tracker";
import type { AnalyticsEventType, AnalyticsProps } from "@/lib/analytics/types";

/**
 * Mounts the analytics tracker into the storefront and emits a `page_view` on
 * every route change — but only after hydration (inside an effect) and only once
 * per URL (a ref guard on top of the tracker's own StrictMode dedup). It reads
 * the full URL from `window.location` rather than `useSearchParams`, so it does
 * not force the route into dynamic rendering. Renders its children unchanged.
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = window.location.pathname + window.location.search;
    if (lastUrl.current === url) return;
    lastUrl.current = url;
    track("page_view", { path: url });
  }, [pathname]);

  return <>{children}</>;
}

/**
 * Imperative tracking for interactive events (add-to-cart, checkout, …). Thin
 * wrapper over the singleton tracker so components don't import it directly.
 */
export function useAnalytics() {
  return {
    track: (type: AnalyticsEventType, props?: AnalyticsProps) => track(type, props),
  };
}
