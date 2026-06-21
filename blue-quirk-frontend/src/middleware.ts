import { NextRequest, NextResponse } from "next/server";

// Only handles the bare root path: send visitors to their preferred locale
// (from the `lang` cookie) instead of a hard-coded default. Scoped to "/" via
// the matcher below so it can never interfere with the other top-level routes
// (/admin-v2, /login, /account, /fr, /ar, ...).
export function middleware(req: NextRequest) {
  const cookie = req.cookies.get("lang")?.value;
  const lang = cookie === "ar" || cookie === "fr" ? cookie : "fr";

  const url = req.nextUrl.clone();
  url.pathname = `/${lang}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/"],
};
