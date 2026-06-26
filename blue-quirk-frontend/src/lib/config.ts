// Single source of truth for the backend API base URL.
//
// Override per environment with NEXT_PUBLIC_API_BASE_URL (e.g.
// https://api.bluequirk.shop/api). The NEXT_PUBLIC_ prefix makes it available in
// both the server and client bundles (and in middleware). Change it ONCE here /
// via the env var — never hardcode the backend URL in individual services.
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9090/api"
).replace(/\/+$/, "");
