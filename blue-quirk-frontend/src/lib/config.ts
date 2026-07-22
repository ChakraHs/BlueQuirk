// Single source of truth for the backend API base URL.
//
// Override per environment with NEXT_PUBLIC_API_BASE_URL (e.g.
// https://api.redquirk.com/api). The NEXT_PUBLIC_ prefix makes it available in
// both the server and client bundles (and in middleware). Change it ONCE here /
// via the env var — never hardcode the backend URL in individual services.
function resolveApiBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  // In the browser, derive the backend host from the page the visitor actually
  // loaded so the app works over the LAN / a device's IP — not just localhost.
  // A phone hitting http://192.168.0.101:3000 must call the backend at
  // http://192.168.0.101:9090, because "localhost" on that phone is the phone.
  // The backend runs on port 9090 on the same host that served the frontend.
  // On the server (SSR / middleware) window is undefined, so we keep localhost.
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:9090/api`;
  }
  return "http://localhost:9090/api";
}

export const API_BASE_URL = resolveApiBaseUrl();

// Public site origin, used to build absolute URLs for SEO (metadataBase,
// canonical, Open Graph, sitemap, robots). Override with NEXT_PUBLIC_SITE_URL.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

// --- Microsoft Clarity --------------------------------------------------------
// Clarity is used STRICTLY for session replay, heatmaps and UX diagnostics. It
// is NOT a source of business metrics — the native analytics pipeline
// (src/lib/analytics/*) remains the single source of truth for those.
//
// The enable toggle + project id are primarily controlled at RUNTIME from the
// admin dashboard (persisted in StoreSettings, read via /api/shop/config). The
// build-time env vars below only act as a fallback (e.g. when the config request
// fails) and as the development gate:
//
//   NEXT_PUBLIC_CLARITY_ENABLED               fallback enable flag
//   NEXT_PUBLIC_CLARITY_PROJECT_ID            fallback project id (tag id)
//   NEXT_PUBLIC_CLARITY_TRACK_IN_DEVELOPMENT  "true" to allow loading in dev builds
function envFlag(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export const clarityConfig = {
  enabled: envFlag(process.env.NEXT_PUBLIC_CLARITY_ENABLED),
  projectId: (process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "").trim(),
  trackInDevelopment: envFlag(process.env.NEXT_PUBLIC_CLARITY_TRACK_IN_DEVELOPMENT),
};

/** Runtime Clarity settings sourced from the admin dashboard (/api/shop/config). */
export type ClarityRuntime = { enabled?: boolean; projectId?: string | null };

/**
 * Resolve whether Clarity should load and with which project id. Fails closed:
 *
 *   • In non-production builds it stays OFF unless trackInDevelopment is set,
 *     regardless of the admin toggle — so local dev never records by accident.
 *   • The admin runtime toggle (when provided) is authoritative for enable/id;
 *     the env vars fill in only when no runtime value is available.
 *   • Requires BOTH an enable flag and a non-empty project id to be active.
 *
 * When it returns { active:false }, nothing Clarity-related is rendered/loaded.
 */
export function resolveClarity(runtime?: ClarityRuntime): { active: boolean; projectId: string } {
  if (process.env.NODE_ENV !== "production" && !clarityConfig.trackInDevelopment) {
    return { active: false, projectId: "" };
  }
  const enabled = runtime ? runtime.enabled === true : clarityConfig.enabled;
  const projectId = ((runtime?.projectId ?? "").trim() || clarityConfig.projectId).trim();
  return { active: enabled && projectId.length > 0, projectId };
}
