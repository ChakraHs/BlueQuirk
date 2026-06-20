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
    ],
  },

  async rewrites() {
    return [
      {
        source: "/",
        destination: "/fr",
      },
    ];
  },

};

module.exports = nextConfig;