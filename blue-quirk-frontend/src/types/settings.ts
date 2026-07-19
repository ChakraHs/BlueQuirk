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

// Admin-editable theme colors. All optional/nullable: a null value means "use the
// storefront's built-in default" (see globals.css --c-* tokens). The keys map 1:1
// to the CSS variables the storefront applies at runtime (ThemeStyle).
export interface ThemeColors {
  primaryColor: string | null;
  primaryHoverColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  surfaceColor: string | null;
  textColor: string | null;
  borderColor: string | null;
  successColor: string | null;
  warningColor: string | null;
  errorColor: string | null;
}

// Ordered map of theme-color field -> the CSS variable it drives. Used by both
// the admin editor (to render the pickers) and ThemeStyle (to emit overrides),
// so the two never drift apart.
export const THEME_COLOR_VARS: Record<keyof ThemeColors, string> = {
  primaryColor: "--c-primary",
  primaryHoverColor: "--c-primary-hover",
  secondaryColor: "--c-secondary",
  accentColor: "--c-accent",
  backgroundColor: "--c-background",
  surfaceColor: "--c-surface",
  textColor: "--c-text",
  borderColor: "--c-border",
  successColor: "--c-success",
  warningColor: "--c-warning",
  errorColor: "--c-error",
};

// Microsoft Clarity (session replay / heatmaps only) — admin-controlled toggle
// and project (tag) id. Not a business-metrics source; the native analytics
// pipeline stays authoritative for those.
export interface ClaritySettings {
  clarityEnabled: boolean;
  clarityProjectId: string | null;
}

export interface StoreSettings extends HeroSettings, ThemeColors, ClaritySettings {
  id?: number;
  storeName: string;
  logoUrl: string | null;
  shippingFee: number;
  freeShippingThreshold: number;
  currency: string;
  defaultLang: string; // "fr" | "ar" | "en"
}

// Public subset returned by GET /api/shop/config (also includes the shipping
// economics, see lib/shipping). Used for storefront branding + hero + theme +
// the Clarity runtime toggle.
export interface PublicShopConfig extends HeroSettings, ThemeColors, ClaritySettings {
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number;
  storeName: string;
  logoUrl: string | null;
  defaultLang: string;
}
