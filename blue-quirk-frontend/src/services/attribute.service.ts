import { PageResponse } from "@/types/page";
import api from "./api";
import { Attribute } from "@/types/attribute";

export const AttributeService = {
  getAll: async (): Promise<Attribute[]> => {
    const res = await api.get("/attributes");
    return res.data;
  },

  getById: async (id: number) => {
    const res = await api.get(`/attributes/${id}`);
    return res.data;
  },

  create: async (data: any) => {
    const res = await api.post("/attributes", data);
    return res.data;
  },

  update: async (id: number, data: any) => {
    const res = await api.put(`/attributes/${id}`, data);
    return res.data;
  },

  delete: async (id: number) => {
    await api.delete(`/attributes/${id}`);
  },
};
