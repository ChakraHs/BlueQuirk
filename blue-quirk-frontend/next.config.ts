import type { NextConfig } from "next";

const nextConfig = {
  // Emit a self-contained server bundle (.next/standalone) so the Docker image
  // can run `node server.js` without the full node_modules tree.
  output: "standalone",

  images: {
    // Cache each OPTIMIZED image (the resized WebP the browser downloads) for a
    // year instead of the 60s Next default. The upstream R2 variant URLs are
    // immutable per upload (UUID-keyed folder), so re-optimizing them is pure
    // waste — and a cold optimize of a large source on the VPS is expensive
    // (measured ~4s for a 4500×5400 PNG). A long TTL means each product/width
    // WebP is generated once and then served from cache. Formats left at the
    // Next default (WebP) on purpose — AVIF is deferred until we measure this.
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        // Backend-served upload images (/uploads/**) when deployed on Railway
        // and Cloudflare R2 is not configured.
        protocol: "https",
        hostname: "**.up.railway.app",
      },
      {
        protocol: "https",
        hostname: "images.ctfassets.net",
      },
      {
        protocol: "https",
        hostname: "ih1.redbubble.net",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
      {
        // Cloudflare R2 public buckets (e.g. bluequirk-media) — catalog images.
        // Wildcard so any R2 public bucket the store uses resolves without a
        // config change (the public *.r2.dev domains are per-bucket).
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        // Local dev: images served from the backend's /uploads/** fallback
        // (used when Cloudflare R2 is not configured, i.e. R2_API_TOKEN unset).
        protocol: "http",
        hostname: "localhost",
        port: "9090",
        pathname: "/uploads/**",
      },
    ],
  },

  // Root path ("/") routing is handled by src/middleware.ts, which redirects to
  // the visitor's preferred locale (from the `lang` cookie).

};

module.exports = nextConfig;