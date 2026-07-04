"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsProvider } from "./analytics/AnalyticsProvider";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </QueryClientProvider>
  );
}
