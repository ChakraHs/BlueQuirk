import api from "./client";
import { IDENTITY_BASE_URL } from "@/lib/config";

const AUTH_URL = `${IDENTITY_BASE_URL}/uaa/token`;

export async function login(email: string, password: string) {
  const { data } = await api.post(AUTH_URL, { email, password });

  if (data.accessToken) {
    localStorage.setItem("accessToken", data.accessToken);
  }
  if (data.refreshToken) {
    localStorage.setItem("refreshToken", data.refreshToken);
  }

  return data;
}

export function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.location.href = "/bq-admin/login";
}
