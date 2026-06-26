import api from "./api";
import { Attribute } from "@/types/attribute";

// Payload for creating/updating an attribute. The backend (`POST/PUT
// /api/attributes`) takes the Attribute shape directly and, on update, replaces
// the value list wholesale, so we send plain `{ value }` rows.
export type AttributePayload = {
  name: string;
  type: string;
  values: { value: string }[];
};

export const AttributeService = {
  getAll: async (): Promise<Attribute[]> => {
    const res = await api.get<Attribute[]>("/attributes");
    return res.data;
  },

  getById: async (id: number): Promise<Attribute> => {
    const res = await api.get<Attribute>(`/attributes/${id}`);
    return res.data;
  },

  create: async (data: AttributePayload): Promise<Attribute> => {
    const res = await api.post<Attribute>("/attributes", data);
    return res.data;
  },

  update: async (id: number, data: AttributePayload): Promise<Attribute> => {
    const res = await api.put<Attribute>(`/attributes/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/attributes/${id}`);
  },
};
