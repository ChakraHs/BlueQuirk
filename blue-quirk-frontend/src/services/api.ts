import axios, { AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/config";
import { TOKEN_KEY, REFRESH_KEY } from "@/lib/auth";

/**
 * The single Axios client for the whole app. One base URL, one token convention
 * (`access_token` / `refresh_token`), one refresh mechanism. All other client
 * modules re-export this instance — do not create new axios instances.
 */
const api = axios.create({ baseURL: API_BASE_URL });

function getStoredToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

// Returns the access token only if present AND not expired. An expired token is
// treated as "no token" so public endpoints aren't rejected by a stale bearer.
function getValidAccessToken(): string | null {
  const token = getStoredToken(TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return null;
    }
  } catch {
    return null;
  }
  return token;
}

export function storeTokens(accessToken?: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

api.interceptors.request.use((config) => {
  const token = getValidAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Single refresh mechanism ---------------------------------------------
// One in-flight refresh is shared across concurrent 401s so we never fire more
// than one /auth/refresh at a time. On failure, tokens are cleared and the
// original error propagates (callers/route guards decide where to redirect).
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredToken(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    storeTokens(data.accessToken, data.refreshToken);
    return data.accessToken ?? null;
  } catch {
    clearTokens();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url: string = original?.url ?? "";

    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/refresh");
    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${newToken}` };
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
