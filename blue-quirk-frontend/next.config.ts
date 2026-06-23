import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
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
        // Cloudflare R2 public bucket (bluequirk-media) — catalog images.
        protocol: "https",
        hostname: "pub-bcddf7eebb064b6fb57f065569be6f5f.r2.dev",
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