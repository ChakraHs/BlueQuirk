import { PageResponse } from "@/types/page";
import api from "./api";
import { Product } from "@/types/product";

const API_BASE_URL = "http://127.0.0.1:9090/api";

export const ProductService = {
  getAll: async (
    page = 0,
    size = 10,
    lang?: string
  ): Promise<PageResponse<Product>> => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });

    if (lang) {
      params.set("lang", lang);
    }

    const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch products: ${res.status}`);
    }

    return res.json();
  },

  getById: async (id: number, lang?: string): Promise<Product> => {
    const query = lang ? `?lang=${encodeURIComponent(lang)}` : "";
    const res = await fetch(`${API_BASE_URL}/products/${id}${query}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch product ${id}: ${res.status}`);
    }

    return res.json();
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post("/products", data);
    return res.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const res = await api.put(`/products/${id}`, data);
    return res.data;
  },

  delete: async (id: number) => {
    await api.delete(`/products/${id}`);
  },
};
