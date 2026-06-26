import { NextRequest, NextResponse } from "next/server";

// Only handles the bare root path: send visitors to their preferred locale.
// Priority: the visitor's `lang` cookie, else the store's admin-configured
// default language (cached briefly to avoid a backend round-trip on every hit),
// else "fr". Scoped to "/" via the matcher below so it can never interfere with
// the other top-level routes (/admin-v2, /login, /account, /fr, /ar, ...).

const CONFIG_URL = "http://127.0.0.1:9090/api/shop/config";
const TTL_MS = 60_000;

// Module-scoped cache so we don't fetch the config on every redirect.
let cachedLang: "fr" | "ar" = "fr";
let cachedAt = 0;

async function defaultLang(): Promise<"fr" | "ar"> {
  if (Date.now() - cachedAt < TTL_MS) return cachedLang;
  try {
    const res = await fetch(CONFIG_URL, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { defaultLang?: string };
      cachedLang = data.defaultLang === "ar" ? "ar" : "fr";
      cachedAt = Date.now();
    }
  } catch {
    // keep the last known / default value on failure
  }
  return cachedLang;
}

export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get("lang")?.value;
  const lang = cookie === "ar" || cookie === "fr" ? cookie : await defaultLang();

  const url = req.nextUrl.clone();
  url.pathname = `/${lang}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/"],
};
