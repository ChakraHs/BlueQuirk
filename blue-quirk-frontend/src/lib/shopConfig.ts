// Server-safe fetch of the public storefront config (branding + shipping +
// default language) from the backend. Used by server components (the [lang]
// layout) and the middleware. Mirrors CategoryService's server-side fetch
// pattern (plain fetch to 127.0.0.1:9090). Falls back to sensible defaults so
// the storefront still renders if the backend is unreachable.
import type { PublicShopConfig } from "@/types/settings";

const CONFIG_URL = "http://127.0.0.1:9090/api/shop/config";

export const SHOP_CONFIG_DEFAULTS: PublicShopConfig = {
  currency: "DH",
  shippingFee: 29,
  freeShippingThreshold: 300,
  storeName: "BlueQuirk",
  logoUrl: null,
  defaultLang: "fr",
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
      defaultLang: data.defaultLang === "ar" ? "ar" : "fr",
    };
  } catch {
    return SHOP_CONFIG_DEFAULTS;
  }
}
