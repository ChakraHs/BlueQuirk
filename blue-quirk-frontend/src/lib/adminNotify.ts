// Device-level admin notification helpers: native browser notifications and a
// subtle sound. Both are per-browser preferences (they depend on this device's
// permission + hardware), so they live in localStorage — not the shared, server
// -side store settings. Everything here fails soft: if the Notification API,
// Web Audio, or a permission is missing, the in-dashboard bell still works.

import type { AdminNotification } from "@/services/notifications";

const BROWSER_PREF = "rq_admin_browser_notif"; // "on" | "off" (default off — opt-in)
const SOUND_PREF = "rq_admin_sound"; // "on" | "off" (default on)

// Currency label shown in the (privacy-limited) browser notification body.
const CURRENCY = "DH";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export type BrowserPermission = NotificationPermission | "unsupported";

export function getPermission(): BrowserPermission {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

/** Browser-notification preference. Default OFF — the admin must opt in. */
export function getBrowserPref(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(BROWSER_PREF) === "on";
}

export function setBrowserPref(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BROWSER_PREF, on ? "on" : "off");
}

/** Sound preference. Default ON (subtle). */
export function getSoundPref(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_PREF) !== "off";
}

export function setSoundPref(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_PREF, on ? "on" : "off");
}

/**
 * Requests notification permission. Never re-prompts once the user has decided:
 * if permission is already "denied" (or "granted") it returns that without
 * asking again — the browser would ignore a repeat request anyway.
 */
export async function requestBrowserPermission(): Promise<BrowserPermission> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Shows a native browser notification for a new order. Privacy-limited: only the
 * order reference + total + item count — never the customer's personal details
 * (those stay inside the secured dashboard). Uses a per-order `tag` so multiple
 * open tabs coalesce into a single OS notification instead of duplicating it.
 */
export function showBrowserNotification(
  n: AdminNotification,
  onClick?: () => void
): void {
  if (!notificationsSupported() || Notification.permission !== "granted" || !getBrowserPref()) {
    return;
  }
  try {
    const notif = new Notification(`REDQUIRK — ${n.title}`, {
      body: `${n.total.toFixed(2)} ${CURRENCY} · ${n.itemCount} ${n.itemCount === 1 ? "item" : "items"}`,
      tag: `rq-order-${n.orderId ?? n.id}`,
      icon: "/favicon.ico",
    });
    notif.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      onClick?.();
      notif.close();
    };
  } catch {
    /* notifications unavailable — ignore */
  }
}

// --- Subtle chime via Web Audio (no audio asset needed) ---------------------
// Reused across events. Respects autoplay policy: the admin is actively using
// the dashboard, so a user gesture has already occurred; we also resume a
// suspended context defensively. Any failure is silently ignored.
let audioCtx: AudioContext | null = null;

export function playChime(): void {
  if (typeof window === "undefined" || !getSoundPref()) return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume().catch(() => {});

    const now = audioCtx.currentTime;
    const notes = [880, 1174.66]; // A5 → D6 — a soft, short two-note rise
    notes.forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.14;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02); // gentle, not loud
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    /* audio unavailable — ignore */
  }
}
