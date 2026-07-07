import { AuthProvider } from "react-admin";
import { login as nativeLogin, logout as nativeLogout } from "@/api/auth";
import { getAuthUser } from "@/lib/auth";

// react-admin auth provider backed by the native backend Identity Domain.
export const authProvider: AuthProvider = {
  login: async ({ login, email, password }) => {
    const identifier = email ?? login;
    await nativeLogin(identifier, password);
  },

  logout: () => {
    // Clear tokens without a hard redirect (react-admin handles navigation).
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    return Promise.resolve();
  },

  checkAuth: () =>
    typeof window !== "undefined" && localStorage.getItem("access_token")
      ? Promise.resolve()
      : Promise.reject(),

  checkError: (error) => {
    if (error?.status === 401 || error?.status === 403) {
      return Promise.reject();
    }
    return Promise.resolve();
  },

  getPermissions: () => Promise.resolve(getAuthUser()?.roles ?? []),
};

// Re-export for callers that used to trigger a full logout+redirect.
export const fullLogout = nativeLogout;
