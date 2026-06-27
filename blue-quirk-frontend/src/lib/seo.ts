// SEO helpers: absolute URLs and canonical/hreflang alternates for localized
// storefront pages.
import { SITE_URL } from "./config";
import { LANGS } from "./lang";

/** Absolute URL on the public site. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Build `alternates` metadata for a localized path. `subpath` is the part after
 * the locale segment (e.g. "" for home, "/product/12"). Produces a canonical for
 * the current language and an hreflang link for every supported locale.
 */
export function buildAlternates(lang: string, subpath = "") {
  const sub = subpath && !subpath.startsWith("/") ? `/${subpath}` : subpath;
  const languages: Record<string, string> = {};
  for (const l of LANGS) {
    languages[l.code] = absoluteUrl(`/${l.code}${sub}`);
  }
  return {
    canonical: absoluteUrl(`/${lang}${sub}`),
    languages,
  };
}
