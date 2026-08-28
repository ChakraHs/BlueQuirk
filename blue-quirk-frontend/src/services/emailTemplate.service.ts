import api from "./api";

export type EmailTemplate = {
  id: number;
  code: string;
  lang: string;
  subject: string;
  body: string;
  active: boolean;
};

export type EmailTemplatePayload = {
  code: string;
  lang: string;
  subject: string;
  body: string;
  active: boolean;
};

export type EmailEventInfo = {
  code: string;
  label: string;
  description: string;
  assigned: boolean;
  active: boolean;
  templateId: number | null;
};

export type EmailVariableInfo = { name: string; description: string };

export type EmailCatalog = {
  lang: string;
  languages: string[];
  events: EmailEventInfo[];
  variables: EmailVariableInfo[];
};

export const EmailTemplateService = {
  // Catalog resolved for one language (fr default, or ar).
  catalog: async (lang: string): Promise<EmailCatalog> =>
    (await api.get<EmailCatalog>("/email-templates/events", { params: { lang } }))
      .data,

  getByCode: async (code: string, lang: string): Promise<EmailTemplate> =>
    (
      await api.get<EmailTemplate>(`/email-templates/code/${code}`, {
        params: { lang },
      })
    ).data,

  create: async (payload: EmailTemplatePayload): Promise<EmailTemplate> =>
    (await api.post<EmailTemplate>("/email-templates", payload)).data,

  update: async (id: number, payload: EmailTemplatePayload): Promise<EmailTemplate> =>
    (await api.put<EmailTemplate>(`/email-templates/${id}`, payload)).data,
};
