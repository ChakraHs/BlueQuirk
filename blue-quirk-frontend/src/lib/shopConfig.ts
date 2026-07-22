// Server-safe fetch of the public storefront config (branding + shipping +
// default language) from the backend. Used by server components (the [lang]
// layout) and the middleware. Mirrors CategoryService's server-side fetch
// pattern (plain fetch to API_BASE_URL). Falls back to sensible defaults so
// the storefront still renders if the backend is unreachable.
import type { PublicShopConfig } from "@/types/settings";
import { API_BASE_URL } from "@/lib/config";

const CONFIG_URL = `${API_BASE_URL}/shop/config`;

export const SHOP_CONFIG_DEFAULTS: PublicShopConfig = {
  currency: "DH",
  shippingFee: 29,
  freeShippingThreshold: 300,
  storeName: "RedQuirk",
  logoUrl: null,
  defaultLang: "fr",
  heroTitleFr: null,
  heroTitleEn: null,
  heroTitleAr: null,
  heroSubtitleFr: null,
  heroSubtitleEn: null,
  heroSubtitleAr: null,
  heroBtnTextColor: null,
  heroBtnBgColor: null,
  heroBgColor: null,
  heroImageUrl: null,
  heroImageMobileUrl: null,
  // Theme colors: null = use the storefront's built-in premium-red defaults.
  primaryColor: null,
  primaryHoverColor: null,
  secondaryColor: null,
  accentColor: null,
  backgroundColor: null,
  surfaceColor: null,
  textColor: null,
  borderColor: null,
  successColor: null,
  warningColor: null,
  errorColor: null,
  // Clarity off by default until an admin enables it.
  clarityEnabled: false,
  clarityProjectId: null,
};

export async function getPublicShopConfig(): Promise<PublicShopConfig> {
  try {
    const res = await fetch(CONFIG_URL, { cache: "no-store" });
    if (!res.ok) return SHOP_CONFIG_DEFAULTS;
    const data = (await res.json()) as Partial<PublicShopConfig>;
    return {
      currency: data.currency ?? SHOP_CONFIG_DEFAULTS.currency,
      shippingFee:
        typeof data.shippingFee === "number" ? data.shippingFee : SHOP_CONFIG_DEFAULTS.shippingFee,
      freeShippingThreshold:
        typeof data.freeShippingThreshold === "number"
          ? data.freeShippingThreshold
          : SHOP_CONFIG_DEFAULTS.freeShippingThreshold,
      storeName: data.storeName?.trim() || SHOP_CONFIG_DEFAULTS.storeName,
      logoUrl: data.logoUrl ?? null,
      defaultLang: ["fr", "ar", "en"].includes(data.defaultLang ?? "")
        ? (data.defaultLang as string)
        : "fr",
      heroTitleFr: data.heroTitleFr ?? null,
      heroTitleEn: data.heroTitleEn ?? null,
      heroTitleAr: data.heroTitleAr ?? null,
      heroSubtitleFr: data.heroSubtitleFr ?? null,
      heroSubtitleEn: data.heroSubtitleEn ?? null,
      heroSubtitleAr: data.heroSubtitleAr ?? null,
      heroBtnTextColor: data.heroBtnTextColor ?? null,
      heroBtnBgColor: data.heroBtnBgColor ?? null,
      heroBgColor: data.heroBgColor ?? null,
      heroImageUrl: data.heroImageUrl ?? null,
      heroImageMobileUrl: data.heroImageMobileUrl ?? null,
      primaryColor: data.primaryColor ?? null,
      primaryHoverColor: data.primaryHoverColor ?? null,
      secondaryColor: data.secondaryColor ?? null,
      accentColor: data.accentColor ?? null,
      backgroundColor: data.backgroundColor ?? null,
      surfaceColor: data.surfaceColor ?? null,
      textColor: data.textColor ?? null,
      borderColor: data.borderColor ?? null,
      successColor: data.successColor ?? null,
      warningColor: data.warningColor ?? null,
      errorColor: data.errorColor ?? null,
      clarityEnabled: data.clarityEnabled === true,
      clarityProjectId: data.clarityProjectId ?? null,
    };
  } catch {
    return SHOP_CONFIG_DEFAULTS;
  }
}
