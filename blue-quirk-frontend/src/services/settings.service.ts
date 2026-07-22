import api from "./api";
import { StoreSettings, ThemeColors } from "@/types/settings";

// Theme colors are sent as strings: a value sets the color, an empty string
// clears it back to the storefront default (matches the backend blankToNull).
export type ThemeColorsPayload = { [K in keyof ThemeColors]: string };

export type StoreSettingsPayload = ThemeColorsPayload & {
  storeName: string;
  logoUrl: string | null;
  shippingFee: number;
  freeShippingThreshold: number;
  currency: string;
  defaultLang: string;
  heroTitleFr: string | null;
  heroTitleEn: string | null;
  heroTitleAr: string | null;
  heroSubtitleFr: string | null;
  heroSubtitleEn: string | null;
  heroSubtitleAr: string | null;
  heroBtnTextColor: string | null;
  heroBtnBgColor: string | null;
  heroBgColor: string | null;
  heroImageUrl: string | null;
  heroImageMobileUrl: string | null;
  // Microsoft Clarity (session replay only).
  clarityEnabled: boolean;
  clarityProjectId: string; // "" clears it
};

export const SettingsService = {
  get: async (): Promise<StoreSettings> => {
    const res = await api.get<StoreSettings>("/settings");
    return res.data;
  },

  update: async (data: StoreSettingsPayload): Promise<StoreSettings> => {
    const res = await api.put<StoreSettings>("/settings", data);
    return res.data;
  },

  // Upload a logo file; the backend stores it in R2 and returns the updated
  // settings (with the new logoUrl).
  uploadLogo: async (file: File): Promise<StoreSettings> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<StoreSettings>("/settings/logo", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // Generic image upload (e.g. hero backgrounds). Returns the public URL only;
  // the caller assigns it to a field and saves via update().
  uploadImage: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<{ url: string }>("/settings/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.url;
  },
};
