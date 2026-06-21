// Client for the Identity-Service (Keycloak wrapper). This is the source of
// truth for user profile data — the shop backend on :9090 only stores
// catalog/order data, not Keycloak accounts.
//
// Host/port mirror the existing login + signup flows (src/api/auth.ts,
// src/app/signup/page.tsx). Keep this in sync if the Docker port changes.
import axios from "axios";
import { TOKEN_KEY } from "@/lib/auth";

export const IDENTITY_BASE_URL = "http://localhost:57825";

const identityApi = axios.create({ baseURL: IDENTITY_BASE_URL });

identityApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export type Profile = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string | null;
  activated?: boolean;
  createdDate?: string | null;
};

export type ProfileUpdate = {
  email: string;
  firstName: string;
  lastName: string;
};

export const IdentityService = {
  /** GET /user/{id} — full profile from Keycloak. */
  getProfile: async (id: string): Promise<Profile> => {
    const { data } = await identityApi.get<Profile>(`/user/${id}`);
    return data;
  },

  /** PUT /user/{id} — update email / first name / last name. */
  updateProfile: async (id: string, body: ProfileUpdate): Promise<Profile> => {
    const { data } = await identityApi.put<Profile>(`/user/${id}`, body);
    return data;
  },

  /** POST /account/change-password — change the signed-in user's password. */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await identityApi.post(`/account/change-password`, {
      currentPassword,
      newPassword,
    });
  },
};

export default identityApi;
