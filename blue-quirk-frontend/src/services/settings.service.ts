import api from "./api";
import { StoreSettings } from "@/types/settings";

export type StoreSettingsPayload = {
  storeName: string;
  logoUrl: string | null;
  shippingFee: number;
  freeShippingThreshold: number;
  currency: string;
  defaultLang: string;
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
};
