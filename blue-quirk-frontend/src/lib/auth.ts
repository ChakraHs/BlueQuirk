// Client-side auth helpers built around the Keycloak JWT issued by the
// Identity-Service. The token is stored in localStorage under `access_token`
// (the key used by the login/signup flows and the storefront Header).
//
// Roles live in the `realm_access.roles` claim — the same claim the backend's
// JwtAuthConverter reads. The realm defines two roles: `admin` and `user`.

export const TOKEN_KEY = "access_token";
export const REFRESH_KEY = "refresh_token";

export type JwtClaims = {
  sub: string;
  email?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: { roles?: string[] };
  exp?: number;
};

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isAdmin: boolean;
};

/** Decode the payload of a JWT without verifying its signature. */
export function decodeToken(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    // Handle UTF-8 characters (e.g. accented names) safely.
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** True when a non-expired token is present. */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  const claims = decodeToken(token);
  if (!claims) return false;
  if (claims.exp && claims.exp * 1000 < Date.now()) return false;
  return true;
}

/** Resolve the current user from the stored token, or null if signed out. */
export function getAuthUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;
  const claims = decodeToken(token);
  if (!claims) return null;

  const roles = claims.realm_access?.roles ?? [];
  return {
    id: claims.sub,
    email: claims.email ?? "",
    username: claims.preferred_username ?? "",
    firstName: claims.given_name ?? "",
    lastName: claims.family_name ?? "",
    roles,
    isAdmin: roles.includes("admin"),
  };
}

export function isAdmin(): boolean {
  return getAuthUser()?.isAdmin ?? false;
}

/** Where the "Account" entry point should land based on the user's role. */
export function accountHref(): string {
  if (!isAuthenticated()) return "/login";
  return isAdmin() ? "/admin-v2" : "/account";
}

export function logout(redirectTo = "/login") {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  window.location.href = redirectTo;
}
