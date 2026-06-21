import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:9090/api",
});

// Returns the access token only if present AND not expired. Sending an expired
// token would make the resource server reject the request (401) even on public
// endpoints, so we treat an expired token as "no token" (anonymous request).
function getValidToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return null; // expired
    }
  } catch {
    return null; // malformed
  }
  return token;
}

// Attach the bearer token on every request when we have a valid one. The backend
// permits public catalog reads anonymously and uses an authenticated token to
// JIT-provision the local user row, so attaching it broadly is intentional.
api.interceptors.request.use((config) => {
  const token = getValidToken();
  if (token) {
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