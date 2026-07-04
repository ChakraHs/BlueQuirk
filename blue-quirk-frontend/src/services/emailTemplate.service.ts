import api from "./api";

export type EmailTemplate = {
  id: number;
  code: string;
  subject: string;
  body: string;
  active: boolean;
};

export type EmailTemplatePayload = {
  code: string;
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
  events: EmailEventInfo[];
  variables: EmailVariableInfo[];
};

export const EmailTemplateService = {
  catalog: async (): Promise<EmailCatalog> =>
    (await api.get<EmailCatalog>("/email-templates/events")).data,

  getByCode: async (code: string): Promise<EmailTemplate> =>
    (await api.get<EmailTemplate>(`/email-templates/code/${code}`)).data,

  create: async (payload: EmailTemplatePayload): Promise<EmailTemplate> =>
    (await api.post<EmailTemplate>("/email-templates", payload)).data,

  update: async (id: number, payload: EmailTemplatePayload): Promise<EmailTemplate> =>
    (await api.put<EmailTemplate>(`/email-templates/${id}`, payload)).data,
};
