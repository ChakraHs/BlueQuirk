"use client";

import { useEffect } from "react";

// Root catch-all error boundary. `global-error` replaces the root layout when an
// error escapes every nested boundary, so it must render its own <html>/<body>.
// Like the storefront boundary it auto-recovers from post-deploy chunk-load
// failures (stale client → navigation → missing hashed chunk) with one reload.
const CHUNK_ERROR =
  /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|is not a valid JavaScript MIME type/i;

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const isChunk = error?.name === "ChunkLoadError" || CHUNK_ERROR.test(error?.message || "");
    if (!isChunk) return;
    const KEY = "rq_chunk_reload_at";
    const last = Number(sessionStorage.getItem(KEY) || "0");
    if (Date.now() - last < 15000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: "sans-serif", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 16, color: "#444" }}>Une erreur est survenue. Rechargement…</p>
          <button
            onClick={() => window.location.reload()}
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
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
