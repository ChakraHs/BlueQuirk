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
