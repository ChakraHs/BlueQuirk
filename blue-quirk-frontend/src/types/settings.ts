export interface StoreSettings {
  id?: number;
  storeName: string;
  logoUrl: string | null;
  shippingFee: number;
  freeShippingThreshold: number;
  currency: string;
  defaultLang: string; // "fr" | "ar"
}

// Public subset returned by GET /api/shop/config (also includes the shipping
// economics, see lib/shipping). Used for storefront branding.
export interface PublicShopConfig {
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number;
  storeName: string;
  logoUrl: string | null;
  defaultLang: string;
}
