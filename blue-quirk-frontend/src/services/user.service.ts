import api from "./api";
import { User } from "@/types/user";

// /api/users is admin-only on the backend, so every call goes through the
// shared axios client, which attaches the admin bearer token.
export const UserService = {
  getAll: async (): Promise<User[]> => {
    const res = await api.get<User[]>(`/users`);
    return res.data;
  },

  getById: async (id: number): Promise<User> => {
    const res = await api.get<User>(`/users/${id}`);
    return res.data;
  },

  delete: async (id: number) => {
    await api.delete(`/users/${id}`);
  },
};
