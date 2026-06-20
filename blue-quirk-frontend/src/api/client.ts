import axios from "axios";
import { logout } from "./auth";

const api = axios.create({
  baseURL: "http://localhost:8080/api", // 👈 your main backend API (products, users…)
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      logout();
    }
    return Promise.reject(err);
  }
);

export default api;
