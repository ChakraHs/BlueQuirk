// Language/locale helpers for the storefront.
//
// The active language lives in the URL ("/fr/..." or "/ar/..."). We persist the
// user's choice in a long-lived `lang` cookie (best practice for guests) and, for
// signed-in users, in the backend (see services/preference.service.ts).

export type LangCode = "fr" | "ar" | "en";

export const LANGS: { code: LangCode; label: string; native: string; dir: "ltr" | "rtl" }[] = [
  { code: "fr", label: "French", native: "Français", dir: "ltr" },
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "ar", label: "Arabic", native: "العربية", dir: "rtl" },
];

export const DEFAULT_LANG: LangCode = "fr";
export const LANG_COOKIE = "lang";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function isLang(value: string | undefined | null): value is LangCode {
  return value === "fr" || value === "ar" || value === "en";
}

/** Text direction for a language (Arabic is RTL, the rest LTR). */
export function dirOf(lang: string): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}

export function getLangCookie(): LangCode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/);
  const value = match?.[1];
  return isLang(value) ? value : null;
}

export function setLangCookie(code: LangCode) {
  if (typeof document === "undefined") return;
  document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/** Replace the leading locale segment of a path with `next` (e.g. /fr/cart -> /ar/cart). */
export function swapLangInPath(pathname: string, next: LangCode): string {
  const segments = pathname.split("/");
  // segments[0] is "" because pathname starts with "/"
  if (isLang(segments[1])) {
    segments[1] = next;
    return segments.join("/") || `/${next}`;
  }
  return `/${next}${pathname === "/" ? "" : pathname}`;
}
