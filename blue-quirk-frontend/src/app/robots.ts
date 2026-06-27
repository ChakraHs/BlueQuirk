import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Served at /robots.txt. Allows the public storefront, blocks private/admin and
// user-specific pages, and points crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin-v2",
        "/account",
        "/login",
        "/signup",
        "/auth",
        "/order-tracking",
        "/*/cart",
        "/*/checkout",
        "/*/wishlist",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
