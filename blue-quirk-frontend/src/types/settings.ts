export interface HeroSettings {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroBgColor: string | null;
  heroImageUrl: string | null;
  heroImageMobileUrl: string | null;
}

export interface StoreSettings extends HeroSettings {
  id?: number;
  storeName: string;
  logoUrl: string | null;
  shippingFee: number;
  freeShippingThreshold: number;
  currency: string;
  defaultLang: string; // "fr" | "ar" | "en"
}

// Public subset returned by GET /api/shop/config (also includes the shipping
// economics, see lib/shipping). Used for storefront branding + hero.
export interface PublicShopConfig extends HeroSettings {
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number;
  storeName: string;
  logoUrl: string | null;
  defaultLang: string;
}
