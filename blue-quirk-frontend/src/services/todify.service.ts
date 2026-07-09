// Admin client for the Todify integration. All calls go through the auth-aware
// `api` client (:9090) and hit the backend's /admin/todify/* endpoints — the
// backend holds the Todify token, so the browser never sees it.
import api from "./api";
import type { OrderResponse } from "./order.service";
import type {
  TodifyEnvelope,
  TodifyTemplate,
  TodifyTemplateDetail,
  TodifyWebhook,
  TodifySyncLog,
} from "@/types/todify";

type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
};

export const TodifyService = {
  status: async (): Promise<{ configured: boolean }> => {
    const { data } = await api.get("/admin/todify/status");
    return data;
  },

  store: async (): Promise<TodifyEnvelope<unknown>> => {
    const { data } = await api.get("/admin/todify/store");
    return data;
  },

  // --- templates ---
  listTemplates: async (
    page = 1
  ): Promise<TodifyEnvelope<TodifyTemplate[]>> => {
    const { data } = await api.get(`/admin/todify/templates?page=${page}`);
    return data;
  },

  templateDetail: async (
    id: string
  ): Promise<TodifyEnvelope<TodifyTemplateDetail>> => {
    const { data } = await api.get(
      `/admin/todify/templates/${encodeURIComponent(id)}`
    );
    return data;
  },

  importTemplate: async (id: string) => {
    const { data } = await api.post(
      `/admin/todify/templates/${encodeURIComponent(id)}/import`
    );
    return data;
  },

  // --- product linking ---
  linkProduct: async (productId: number, templateId: string) => {
    const { data } = await api.post(
      `/admin/todify/products/${productId}/link`,
      { templateId }
    );
    return data;
  },

  unlinkProduct: async (productId: number) => {
    const { data } = await api.delete(
      `/admin/todify/products/${productId}/link`
    );
    return data;
  },

  // --- orders ---
  orders: async (): Promise<OrderResponse[]> => {
    const { data } = await api.get<OrderResponse[]>("/admin/todify/orders");
    return data;
  },

  syncOrder: async (id: number): Promise<OrderResponse> => {
    const { data } = await api.post<OrderResponse>(
      `/admin/todify/orders/${id}/sync`
    );
    return data;
  },

  refreshOrder: async (id: number): Promise<OrderResponse> => {
    const { data } = await api.post<OrderResponse>(
      `/admin/todify/orders/${id}/refresh`
    );
    return data;
  },

  // --- logs ---
  logs: async (page = 0, type?: string): Promise<Page<TodifySyncLog>> => {
    const q = new URLSearchParams({ page: String(page), size: "30" });
    if (type) q.set("type", type);
    const { data } = await api.get(`/admin/todify/logs?${q.toString()}`);
    return data;
  },

  // --- webhooks ---
  listWebhooks: async (): Promise<TodifyEnvelope<TodifyWebhook[]>> => {
    const { data } = await api.get("/admin/todify/webhooks");
    return data;
  },

  registerWebhook: async (
    url: string,
    event: string
  ): Promise<TodifyEnvelope<TodifyWebhook>> => {
    const { data } = await api.post("/admin/todify/webhooks", { url, event });
    return data;
  },

  deleteWebhook: async (id: number) => {
    const { data } = await api.delete(`/admin/todify/webhooks/${id}`);
    return data;
  },

  // --- connection settings (DB-backed, editable in admin; env is the fallback) ---
  getSettings: async (): Promise<TodifySettings> => {
    const { data } = await api.get<TodifySettings>("/admin/todify/settings");
    return data;
  },

  updateSettings: async (
    payload: TodifySettingsUpdate
  ): Promise<TodifySettings> => {
    const { data } = await api.put<TodifySettings>("/admin/todify/settings", payload);
    return data;
  },
};

/** Masked view of the Todify connection config (never exposes the raw secrets). */
export type TodifySettings = {
  enabled: boolean;
  baseUrl: string;
  apiTokenSet: boolean;
  apiTokenMasked: string | null;
  webhookSecretSet: boolean;
  configured: boolean;
  source: "db" | "env";
  updatedAt: string | null;
  updatedByEmail: string | null;
};

/** Update payload — omit a secret field to leave it unchanged. */
export type TodifySettingsUpdate = {
  enabled?: boolean;
  baseUrl?: string;
  apiToken?: string;
  webhookSecret?: string;
};
