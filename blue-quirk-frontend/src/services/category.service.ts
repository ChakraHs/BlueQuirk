import api from "./api";
import { Category } from "@/types/category";
import { API_BASE_URL } from "@/lib/config";
import { serverReadInit } from "@/lib/serverFetch";

/** Builds a `?lang=…&activeOnly=…` query string, omitting empty parts. */
function categoryQuery(lang?: string, activeOnly?: boolean): string {
  const params = new URLSearchParams();
  if (lang) params.set("lang", lang);
  // Storefront callers pass activeOnly=true so inactive categories are hidden. Admin
  // callers omit it and receive every category.
  if (activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const CategoryService = {
  getAll: async (
    lang?: string,
    revalidate?: number,
    activeOnly = false
  ): Promise<Category[]> => {
    const res = await fetch(
      `${API_BASE_URL}/categories${categoryQuery(lang, activeOnly)}`,
      serverReadInit(revalidate)
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch categories: ${res.status}`);
    }

    return res.json();
  },

  getById: async (id: number, lang?: string, activeOnly = false) => {
    const res = await fetch(
      `${API_BASE_URL}/categories/${id}${categoryQuery(lang, activeOnly)}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch category ${id}: ${res.status}`);
    }

    return res.json();
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post("/categories", data);
    return res.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const res = await api.put(`/categories/${id}`, data);
    return res.data;
  },

  delete: async (id: number) => {
    await api.delete(`/categories/${id}`);
  },
};
