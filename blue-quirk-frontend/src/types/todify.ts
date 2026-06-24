// Shapes for the Admin → Todify section. The list/detail endpoints proxy Todify's
// envelope `{ success, data, meta }`, so these mirror the documented fields.

export type TodifyTemplate = {
  id: string;
  name: string;
  description?: string | null;
  sku?: string;
  thumbnail?: string;
  images?: string[];
};

export type TodifyTemplateDetail = TodifyTemplate & {
  attributes?: Record<string, Record<string, string>>;
  variants?: { variant: Record<string, string> }[];
};

export type TodifyPageMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type TodifyEnvelope<T> = {
  success: boolean;
  data: T;
  meta?: TodifyPageMeta;
  message?: string;
};

export type TodifyWebhook = {
  id: number;
  url: string;
  event: string;
  is_active?: boolean;
  created_at?: string;
  secret?: string; // only returned once, on registration
};

export type TodifySyncLog = {
  id: number;
  type: "REQUEST" | "RESPONSE" | "ERROR" | "WEBHOOK" | "RETRY";
  event?: string;
  direction?: string;
  orderId?: number;
  templateId?: string;
  httpStatus?: number;
  requestBody?: string;
  responseBody?: string;
  errorMessage?: string;
  deliveryId?: string;
  createdAt: string;
};

export const TODIFY_SYNC_STATES = [
  "NOT_APPLICABLE",
  "PENDING",
  "SENT",
  "FAILED",
  "RETRYING",
] as const;
export type TodifySyncState = (typeof TODIFY_SYNC_STATES)[number];

export const TODIFY_WEBHOOK_EVENTS = [
  "template.created",
  "template.updated",
  "template.deleted",
  "order.created",
  "order.status_changed",
] as const;
