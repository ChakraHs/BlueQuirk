// Admin API for deliverable cities and their per-city shipping economics. Uses the
// shared authenticated axios client (never a new instance / token). The public
// storefront reads its own customer-safe list via services/city.service.ts.
import api from "@/services/api";

export type AdminCity = {
  id: number;
  name: string;
  /** Customer delivery price — shown at checkout and added to the order total. */
  shippingFee: number;
  /** Internal real logistics cost — profit only, never shown to the customer. */
  realShippingCost: number;
  active: boolean;
  sortOrder: number;
};

export type CityInput = {
  name?: string;
  shippingFee?: number;
  realShippingCost?: number;
  active?: boolean;
  sortOrder?: number;
};

export const CityAdminService = {
  async list(): Promise<AdminCity[]> {
    const { data } = await api.get<AdminCity[]>("/cities");
    return data;
  },

  async create(input: CityInput): Promise<AdminCity> {
    const { data } = await api.post<AdminCity>("/cities", input);
    return data;
  },

  async update(id: number, input: CityInput): Promise<AdminCity> {
    const { data } = await api.put<AdminCity>(`/cities/${id}`, input);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/cities/${id}`);
  },

  /** Bulk add/update from a pasted list; upserts by name. Returns how many changed. */
  async bulkImport(entries: CityInput[]): Promise<number> {
    const { data } = await api.post<{ imported: number }>("/cities/bulk", entries);
    return data.imported;
  },
};
