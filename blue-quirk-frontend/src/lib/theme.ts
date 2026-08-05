// Storefront theme runtime (light / dark / system).
//
// Dark mode is class-driven: the resolved theme toggles the `dark` class on
// <html>, which flips the CSS-variable tokens in globals.css (surfaces, the
// neutral gray ramp, brand/status tints). The user's *preference* — one of
// "light" | "dark" | "system" — is persisted in localStorage and re-applied on
// every visit. In "system" mode we track the OS `prefers-color-scheme` live.
//
// This module is intentionally framework-agnostic and holds no React state: the
// source of truth is localStorage + the <html> class, so multiple toggle
// instances (header, account page) and separate <html> route-roots all stay in
// sync via a lightweight event. The matching pre-paint script lives in
// components/ThemeScript.tsx to avoid a flash of the wrong theme.

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "rq-theme";
const THEME_EVENT = "rq-theme-change";
export const THEMES: Theme[] = ["light", "dark", "system"];

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/** The stored preference, defaulting to "system" (SSR-safe). */
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(raw)) return raw;
  } catch {
    /* localStorage unavailable (privacy mode) — fall through to default */
  }
  return "system";
}

/** What the OS currently prefers. */
export function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Collapse a preference into the concrete theme to paint. */
export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? systemTheme() : theme;
}

/** Apply a resolved theme to the document (class + native color-scheme). */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

/**
 * Persist a preference, paint it, and notify every listener. Called by the
 * toggle UIs. Returns the resolved theme actually applied.
 */
export function setTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore persistence failure — the in-memory paint still applies */
  }
  applyResolvedTheme(resolved);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
  return resolved;
}

/**
 * Subscribe to preference changes. Fires when:
 *  - another toggle on the page calls setTheme (THEME_EVENT),
 *  - another tab changes the stored value (storage event),
 *  - the OS theme changes while in "system" mode (matchMedia).
 * Returns an unsubscribe function.
 */
export function subscribeTheme(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onEvent = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) {
      // Re-apply so a change made in another tab is reflected here too.
      applyResolvedTheme(resolveTheme(getStoredTheme()));
      callback();
    }
  };

  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if (getStoredTheme() === "system") {
      applyResolvedTheme(systemTheme());
      callback();
    }
  };

  window.addEventListener(THEME_EVENT, onEvent);
  window.addEventListener("storage", onStorage);
  media?.addEventListener?.("change", onMedia);

  return () => {
    window.removeEventListener(THEME_EVENT, onEvent);
    window.removeEventListener("storage", onStorage);
    media?.removeEventListener?.("change", onMedia);
  };
}
