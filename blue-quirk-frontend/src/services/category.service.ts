import api from "./api";
import { Category } from "@/types/category";

const API_BASE_URL = "http://127.0.0.1:9090/api";

export const CategoryService = {
  getAll: async (lang?: string): Promise<Category[]> => {
    const query = lang ? `?lang=${encodeURIComponent(lang)}` : "";
    const res = await fetch(`${API_BASE_URL}/categories${query}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch categories: ${res.status}`);
    }

    return res.json();
  },

  getById: async (id: number, lang?: string) => {
    const query = lang ? `?lang=${encodeURIComponent(lang)}` : "";
    const res = await fetch(`${API_BASE_URL}/categories/${id}${query}`, {
      cache: "no-store",
    });

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
