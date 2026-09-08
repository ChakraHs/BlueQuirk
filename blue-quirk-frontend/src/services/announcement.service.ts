// Storefront announcement bar — admin CRUD + reorder + global toggle. Uses the shared
// axios client (`@/services/api`). The public storefront feed is fetched server-side
// (see lib/announcementBar.ts) and hydrated into the bar, so there is no client fetch
// here for it. The backend is the single source of truth: it already filters
// announcements to the eligible, scheduled, priority-ordered set.
import api from "./api";

export type AnnouncementType =
  | "INFO"
  | "PROMOTION"
  | "SHIPPING"
  | "NEW_COLLECTION"
  | "IMPORTANT";

/** How the bar transitions between announcements. */
export type AnnouncementAnimation = "FADE" | "SLIDE" | "CAROUSEL";

/** Bar-level (global) presentation config. */
export type BarSettings = {
  enabled: boolean;
  bgColor: string | null;
  textColor: string | null;
  animation: AnnouncementAnimation;
  rotationSeconds: number;
};

/** Full admin view of one announcement (+ computed status). */
export type Announcement = {
  id: number;
  messageFr: string;
  messageEn: string | null;
  messageAr: string | null;
  type: AnnouncementType;
  priority: number;
  active: boolean;
  startAt: string | null;
  endAt: string | null;
  link: string | null;
  linkTextFr: string | null;
  linkTextEn: string | null;
  linkTextAr: string | null;
  openInNewTab: boolean;
  icon: string | null;
  bgColor: string | null;
  textColor: string | null;
  displayDuration: number | null;
  dismissible: boolean;
  status: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "DISABLED";
  updatedByEmail: string | null;
  updatedAt: string | null;
};

/** Create/update payload. */
export type AnnouncementRequest = {
  messageFr: string;
  messageEn?: string | null;
  messageAr?: string | null;
  type: AnnouncementType;
  priority?: number;
  active?: boolean;
  startAt?: string | null;
  endAt?: string | null;
  link?: string | null;
  linkTextFr?: string | null;
  linkTextEn?: string | null;
  linkTextAr?: string | null;
  openInNewTab?: boolean;
  icon?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
  displayDuration?: number | null;
  dismissible?: boolean;
};

/** Storefront-safe, language-resolved announcement (from the public feed). */
export type AnnouncementPublic = {
  id: number;
  message: string;
  type: AnnouncementType;
  link: string | null;
  linkText: string | null;
  openInNewTab: boolean;
  icon: string | null;
  bgColor: string | null;
  textColor: string | null;
  displayDuration: number | null;
  dismissible: boolean;
};

/** The whole bar payload: global config + eligible ordered items. */
export type AnnouncementBar = {
  enabled: boolean;
  bgColor: string | null;
  textColor: string | null;
  animation: AnnouncementAnimation;
  rotationSeconds: number;
  items: AnnouncementPublic[];
};

export const AnnouncementService = {
  list: async (): Promise<Announcement[]> => {
    const { data } = await api.get<Announcement[]>("/announcements");
    return data;
  },
  get: async (id: number): Promise<Announcement> => {
    const { data } = await api.get<Announcement>(`/announcements/${id}`);
    return data;
  },
  create: async (payload: AnnouncementRequest): Promise<Announcement> => {
    const { data } = await api.post<Announcement>("/announcements", payload);
    return data;
  },
  update: async (id: number, payload: AnnouncementRequest): Promise<Announcement> => {
    const { data } = await api.put<Announcement>(`/announcements/${id}`, payload);
    return data;
  },
  setActive: async (id: number, active: boolean): Promise<Announcement> => {
    const { data } = await api.patch<Announcement>(`/announcements/${id}/status`, { active });
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/announcements/${id}`);
  },
  reorder: async (ids: number[]): Promise<Announcement[]> => {
    const { data } = await api.put<Announcement[]>("/announcements/reorder", { ids });
    return data;
  },
  getBarSettings: async (): Promise<BarSettings> => {
    const { data } = await api.get<BarSettings>("/announcements/settings");
    return data;
  },
  setBarSettings: async (payload: BarSettings): Promise<BarSettings> => {
    const { data } = await api.put<BarSettings>("/announcements/settings", payload);
    return data;
  },
};
