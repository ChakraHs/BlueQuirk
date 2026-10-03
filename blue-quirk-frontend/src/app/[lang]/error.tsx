"use client";

import { useEffect } from "react";

// Storefront error boundary (covers the whole /[lang] subtree, incl. product pages).
//
// The common failure here is a *chunk-load error*: a browser still holding a
// page from a PREVIOUS frontend build performs a client-side navigation (e.g.
// tapping a product) and tries to lazy-load a route chunk whose content-hashed
// filename no longer exists — the old build's files are removed on each deploy,
// and chunks are served `immutable`. The request 404s and React surfaces the
// generic "Application error: a client-side exception has occurred". The HTML
// document is `no-store`, so a single hard reload pulls the fresh manifest and
// recovers — which is exactly what users were doing by hand. We do it for them.
const CHUNK_ERROR =
  /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|is not a valid JavaScript MIME type/i;

function isChunkError(error?: Error) {
  return !!error && (error.name === "ChunkLoadError" || CHUNK_ERROR.test(error.message || ""));
}

const COPY: Record<string, { msg: string; retry: string }> = {
  fr: { msg: "Une erreur est survenue. Rechargement…", retry: "Recharger" },
  ar: { msg: "حدث خطأ. جارٍ إعادة التحميل…", retry: "إعادة التحميل" },
  en: { msg: "Something went wrong. Reloading…", retry: "Reload" },
};

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!isChunkError(error)) return;
    // Guard against reload loops: auto-reload at most once per ~15s window. A
    // fresh reload loads the current build, so the error won't recur.
    const KEY = "rq_chunk_reload_at";
    const last = Number(sessionStorage.getItem(KEY) || "0");
    if (Date.now() - last < 15000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }, [error]);

  const path = typeof window !== "undefined" ? window.location.pathname : "/fr";
  const lang = path.startsWith("/ar") ? "ar" : path.startsWith("/en") ? "en" : "fr";
  const copy = COPY[lang] ?? COPY.fr;

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 16, color: "#444" }}>{copy.msg}</p>
      <button
        onClick={() => {
          // Non-chunk errors: retry the render first, fall back to a hard reload.
          try {
            reset();
          } catch {
            window.location.reload();
          }
        }}
        style={{
          borderRadius: 9999,
          padding: "10px 22px",
          background: "#111",
          color: "#fff",
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
        }}
      >
        {copy.retry}
      </button>
    </div>
  );
}
