import api from "./client";

const AUTH_URL = "http://localhost:57825/uaa/token";

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
