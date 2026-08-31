"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsProvider } from "./analytics/AnalyticsProvider";
import { ClarityProvider } from "./analytics/ClarityProvider";
import { TrackingProvider } from "./analytics/TrackingProvider";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Session replay / heatmaps only — separate from, and never a substitute
          for, the native AnalyticsProvider (business metrics). */}
      <ClarityProvider />
      {/* Marketing/ads tracking (Meta Pixel today; GA4/TikTok/CAPI later) via the
          provider-neutral TrackingService. Loads asynchronously, fails closed,
          and never blocks commerce. */}
      <TrackingProvider />
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </QueryClientProvider>
  );
}
