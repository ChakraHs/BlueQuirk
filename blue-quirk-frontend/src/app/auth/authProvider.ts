import { AuthProvider } from "react-admin";
import { IDENTITY_BASE_URL } from "@/lib/config";

export const authProvider: AuthProvider = {
  login: async ({ login, email, password }) => {
    // Choose login or email
    const body = login
      ? { login, password }
      : { email, password };

    const response = await fetch(`${IDENTITY_BASE_URL}/uaa/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Invalid credentials");
    }

    const data = await response.json();
    // match your backend response field names (check TokenResponse DTO)
    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem("refresh_token", data.refreshToken);

    return Promise.resolve();
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return Promise.resolve();
  },

  checkAuth: () =>
    localStorage.getItem("access_token") ? Promise.resolve() : Promise.reject(),

  checkError: (error) => {
    if (error.status === 401 || error.status === 403) {
      localStorage.removeItem("access_token");
      return Promise.reject();
    }
    return Promise.resolve();
  },

  getPermissions: () => Promise.resolve(['admin']),
  // empty array

};
