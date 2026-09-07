// Server-safe fetch of the public announcement bar from the backend. Used by the
// [lang] layout (a server component) so the bar is present in the initial HTML — no
// client request, no layout shift (spec §18/§22). Mirrors lib/shopConfig's SSR fetch
// pattern. Fails closed (bar hidden) so the storefront always renders if the backend
// is unreachable (spec §26).
import { API_BASE_URL } from "@/lib/config";
import type { AnnouncementBar, AnnouncementAnimation } from "@/services/announcement.service";

const EMPTY: AnnouncementBar = {
  enabled: false,
  bgColor: null,
  textColor: null,
  animation: "FADE",
  rotationSeconds: 5,
  items: [],
};

function normAnimation(v: unknown): AnnouncementAnimation {
  return v === "SLIDE" || v === "CAROUSEL" ? v : "FADE";
}

export async function getAnnouncementBar(lang: string): Promise<AnnouncementBar> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/shop/announcements?lang=${encodeURIComponent(lang)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return EMPTY;
    const data = (await res.json()) as Partial<AnnouncementBar>;
    return {
      enabled: data.enabled === true,
      bgColor: data.bgColor ?? null,
      textColor: data.textColor ?? null,
      animation: normAnimation(data.animation),
      rotationSeconds:
        typeof data.rotationSeconds === "number" && data.rotationSeconds > 0 ? data.rotationSeconds : 5,
      items: Array.isArray(data.items) ? data.items : [],
    };
  } catch {
    return EMPTY;
  }
}
