import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { LANGS } from "@/lib/lang";
import { CategoryService } from "@/services/category.service";
import { ProductService } from "@/services/product.service";

// Served at /sitemap.xml. Lists the home, category and product pages for every
// locale, each with hreflang alternates. Fetched fresh (no-store) so new
// products/categories appear without a rebuild.
const LANG_CODES = LANGS.map((l) => l.code);

function languagesFor(sub: string): Record<string, string> {
  return Object.fromEntries(LANG_CODES.map((l) => [l, `${SITE_URL}/${l}${sub}`]));
}

function entriesFor(
  sub: string,
  changeFrequency: "daily" | "weekly",
  priority: number
): MetadataRoute.Sitemap {
  const languages = languagesFor(sub);
  return LANG_CODES.map((l) => ({
    url: `${SITE_URL}/${l}${sub}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [...entriesFor("", "daily", 1)];

  const [categories, products] = await Promise.all([
    CategoryService.getAll("fr").catch(() => []),
    ProductService.getAll(0, 1000, "fr", "PUBLISHED")
      .then((r) => r.content)
      .catch(() => []),
  ]);

  for (const c of categories) {
    entries.push(...entriesFor(`/category/${c.id}`, "weekly", 0.7));
  }
  for (const p of products) {
    entries.push(...entriesFor(`/product/${p.id}`, "weekly", 0.8));
  }

  return entries;
}
