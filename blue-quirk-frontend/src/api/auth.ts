// Native authentication API (backend Identity Domain). Uses the single app Axios
// client and the single token convention (access_token / refresh_token).
import api, { storeTokens, clearTokens } from "@/services/api";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  emailVerified: boolean;
  roles: string[];
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
};

export async function login(email: string, password: string, rememberMe = false) {
  const { data } = await api.post<TokenResponse>("/auth/login", { email, password, rememberMe });
  storeTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function register(email: string, password: string, name: string) {
  const { data } = await api.post<TokenResponse>("/auth/register", { email, password, name });
  storeTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout(redirectTo = "/login") {
  const refreshToken =
    typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
  try {
    if (refreshToken) await api.post("/auth/logout", { refreshToken });
  } catch {
    // Best-effort server-side revocation; always clear locally.
  }
  clearTokens();
  if (typeof window !== "undefined") window.location.href = redirectTo;
}
