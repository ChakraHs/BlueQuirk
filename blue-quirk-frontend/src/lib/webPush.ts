// Web Push (VAPID) client helpers. This is what delivers real OS notifications
// in the background (tab closed) and the ONLY path that reaches iOS/Safari
// (installed to the Home Screen). Fails soft everywhere: if service workers or
// the Push API are unavailable, callers fall back to the in-app bell + sound.

import {
  deletePushSubscription,
  fetchPushPublicKey,
  savePushSubscription,
} from "@/services/notifications";

const SW_URL = "/sw.js";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iOS (incl. iPadOS masquerading as Mac with touch). */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
  return iOSDevice || iPadOS;
}

/** Whether the page runs as an installed/standalone PWA (required by iOS). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    // iOS Safari exposes this legacy flag on navigator.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_URL);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_URL);
}

/** Current push subscription for this browser, if any. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL);
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** True when this browser is already subscribed AND permission is granted. */
export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  return (await getExistingSubscription()) != null;
}

/**
 * Enables push: registers the SW, requests permission (never re-prompts once
 * decided), subscribes with the backend's VAPID key, and stores the subscription.
 * Returns a status the UI can explain.
 */
export async function enablePush(): Promise<
  "enabled" | "denied" | "unsupported" | "not-configured" | "error"
> {
  if (!pushSupported()) return "unsupported";
  try {
    const { enabled, publicKey } = await fetchPushPublicKey();
    if (!enabled || !publicKey) return "not-configured";

    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return perm === "denied" ? "denied" : "error";
    } else if (Notification.permission !== "granted") {
      return "denied";
    }

    const reg = await getRegistration();
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    await savePushSubscription(sub.toJSON());
    return "enabled";
  } catch (e) {
    console.warn("[push] enable failed", e);
    return "error";
  }
}

/** Disables push: unsubscribes locally and removes it from the backend. */
export async function disablePush(): Promise<void> {
  try {
    const sub = await getExistingSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      try {
        await sub.unsubscribe();
      } catch {
        /* ignore */
      }
      try {
        await deletePushSubscription(endpoint);
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    console.warn("[push] disable failed", e);
  }
}

/** Base64url VAPID key → Uint8Array for applicationServerKey. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
