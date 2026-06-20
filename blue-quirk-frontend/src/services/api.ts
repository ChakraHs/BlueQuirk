import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:9090/api",
});

// attach token always
api.interceptors.request.use((config) => {
  let token = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("access_token");
  }

  const isPublic = true;

  if (token && !isPublic) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// global auth guard
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      console.warn("Token expired or invalid → logging out");

      // localStorage.removeItem("access_token");
      // localStorage.removeItem("refresh_token");

      // window.location.href = "/login";

      console.error("Access denied (401): user has no permission for this action");
    }

    if (status === 403) {
      console.error("Access denied (403): user has no permission for this action");
    }

    return Promise.reject(error);
  }
);

export default api;