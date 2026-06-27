export interface HeroSettings {
  // Title + subtitle are localized per language (fr / en / ar).
  heroTitleFr: string | null;
  heroTitleEn: string | null;
  heroTitleAr: string | null;
  heroSubtitleFr: string | null;
  heroSubtitleEn: string | null;
  heroSubtitleAr: string | null;
  // Primary ("shop all") button colours.
  heroBtnTextColor: string | null;
  heroBtnBgColor: string | null;
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
