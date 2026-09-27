// Care & Wear guide templates — admin CRUD. Uses the shared axios client
// (`@/services/api`). The storefront never calls these endpoints: each product
// carries its resolved care guide inside the product detail response. The admin
// product form uses `list()` to populate the template picker.
import api from "./api";

/** One language's care-guide sections (admin edit + full response). */
export type CareGuideTranslation = {
  lang: "fr" | "en" | "ar";
  fabricAndFeel: string | null;
  washingAndDrying: string | null;
  ironing: string | null;
  printCare: string | null;
  tips: string | null;
};

/** Full admin view of a care-guide template. */
export type CareGuideTemplate = {
  id: number;
  name: string;
  productType: "T_SHIRT" | "HOODIE" | null;
  seeded: boolean;
  /** How many products currently use it (blocks deletion until 0). */
  inUseCount: number;
  translations: CareGuideTranslation[];
  updatedByEmail: string | null;
  updatedAt: string | null;
};

/** Create/update payload. */
export type CareGuideTemplateRequest = {
  name: string;
  productType?: "T_SHIRT" | "HOODIE" | null;
  translations: CareGuideTranslation[];
};

export const CareGuideService = {
  list: async (): Promise<CareGuideTemplate[]> => {
    const { data } = await api.get<CareGuideTemplate[]>("/care-guides");
    return data;
  },
  get: async (id: number): Promise<CareGuideTemplate> => {
    const { data } = await api.get<CareGuideTemplate>(`/care-guides/${id}`);
    return data;
  },
  create: async (payload: CareGuideTemplateRequest): Promise<CareGuideTemplate> => {
    const { data } = await api.post<CareGuideTemplate>("/care-guides", payload);
    return data;
  },
  update: async (id: number, payload: CareGuideTemplateRequest): Promise<CareGuideTemplate> => {
    const { data } = await api.put<CareGuideTemplate>(`/care-guides/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/care-guides/${id}`);
  },
};
