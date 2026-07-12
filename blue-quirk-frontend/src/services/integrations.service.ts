// Admin client for third-party integration credentials (Cloudflare R2 image
// storage, Resend email). All calls go through the auth-aware `api` client
// (:9090) and hit /admin/integrations/*. The backend holds the secrets, so the
// browser only ever sees masked values + "set" flags — never the raw keys.
import api from "./api";

/** Masked view of the integration credentials (never exposes raw secrets). */
export type IntegrationSettings = {
  r2ApiTokenSet: boolean;
  r2ApiTokenMasked: string | null;
  r2Source: "db" | "env";
  resendApiKeySet: boolean;
  resendApiKeyMasked: string | null;
  resendSource: "db" | "env";
  resendFrom: string;
  updatedAt: string | null;
  updatedByEmail: string | null;
};

/** Update payload — omit a secret field to leave it unchanged; send "" to clear. */
export type IntegrationSettingsUpdate = {
  r2ApiToken?: string;
  resendApiKey?: string;
  resendFrom?: string;
};

export const IntegrationsService = {
  getSettings: async (): Promise<IntegrationSettings> => {
    const { data } = await api.get<IntegrationSettings>("/admin/integrations/settings");
    return data;
  },

  updateSettings: async (
    payload: IntegrationSettingsUpdate
  ): Promise<IntegrationSettings> => {
    const { data } = await api.put<IntegrationSettings>(
      "/admin/integrations/settings",
      payload
    );
    return data;
  },
};
