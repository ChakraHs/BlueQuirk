import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const lang = req.cookies.get("lang")?.value || "fr";

  // ignore system routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // if already localized → continue
  if (pathname.startsWith("/fr") || pathname.startsWith("/ar")) {
    return NextResponse.next();
  }

  // rewrite "/" → "/fr"
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = `/${lang}`;
    return NextResponse.rewrite(url);
  }

  // rewrite ALL other routes → /fr/...
  const url = req.nextUrl.clone();
  url.pathname = `/${lang}${pathname}`;

  return NextResponse.rewrite(url);
}