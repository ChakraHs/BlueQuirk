// Persists per-user storefront preferences (UI language) in the shop backend,
// keyed by the Keycloak user id (the JWT `sub`). Used only for signed-in users;
// guests rely on the `lang` cookie.
import api from "./api";
import type { LangCode } from "@/lib/lang";

export const PreferenceService = {
  get: async (userId: string): Promise<{ language: LangCode } | null> => {
    const res = await api.get(`/preferences/${userId}`);
    // Backend returns 204 (empty) when no preference is stored yet.
    if (!res.data) return null;
    return res.data;
  },

  save: async (userId: string, language: LangCode): Promise<void> => {
    await api.put(`/preferences/${userId}`, { language });
  },
};
