"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsProvider } from "./analytics/AnalyticsProvider";
import { ClarityProvider } from "./analytics/ClarityProvider";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Session replay / heatmaps only — separate from, and never a substitute
          for, the native AnalyticsProvider (business metrics). */}
      <ClarityProvider />
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </QueryClientProvider>
  );
}
