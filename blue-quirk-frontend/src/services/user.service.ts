import api from "./api";
import { User } from "@/types/user";

const API_BASE_URL = "http://127.0.0.1:9090/api";

export const UserService = {
  getAll: async (): Promise<User[]> => {
    const res = await fetch(`${API_BASE_URL}/users`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch users: ${res.status}`);
    }

    return res.json();
  },

  getById: async (id: number): Promise<User> => {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch user ${id}: ${res.status}`);
    }

    return res.json();
  },

  delete: async (id: number) => {
    await api.delete(`/users/${id}`);
  },
};
