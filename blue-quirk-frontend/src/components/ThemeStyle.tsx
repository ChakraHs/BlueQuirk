// Server component that applies the admin-configured theme colors at runtime.
//
// The storefront's premium-red defaults live in globals.css (:root --c-* tokens),
// so the site is fully themed WITHOUT this component. ThemeStyle only emits the
// overrides an admin has actually customized in Settings → Theme colors, as the
// same CSS variables — so a color change re-themes the whole site (storefront +
// admin) with no code change and no client JS. Rendered inline in every root
// layout's <body>; `:root` is not scoped, so a single <style> themes the document.
import { getPublicShopConfig } from "@/lib/shopConfig";
import { THEME_COLOR_VARS, type ThemeColors } from "@/types/settings";

// Only accept genuine CSS color values (hex / rgb(a) / hsl(a) / named color).
// Admins are trusted, but this keeps arbitrary CSS out of the injected <style>.
function safeColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = value.trim();
  if (/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s)) return s;
  if (/^(?:rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\)$/.test(s)) return s;
  if (/^[a-zA-Z]{3,20}$/.test(s)) return s; // css named colors (e.g. "crimson")
  return null;
}

export default async function ThemeStyle() {
  const config = await getPublicShopConfig();

  const decls: string[] = [];
  for (const key of Object.keys(THEME_COLOR_VARS) as (keyof ThemeColors)[]) {
    const safe = safeColor(config[key]);
    if (safe) decls.push(`${THEME_COLOR_VARS[key]}:${safe}`);
  }

  // Nothing customized → fall back entirely to the CSS defaults.
  if (decls.length === 0) return null;

  return (
    <style
      id="rq-theme-overrides"
      dangerouslySetInnerHTML={{ __html: `:root{${decls.join(";")}}` }}
    />
  );
}
