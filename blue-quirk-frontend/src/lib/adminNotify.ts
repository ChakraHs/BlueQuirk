// In-app notification sound. The OS/desktop/mobile popup is handled by Web Push
// (see lib/webPush.ts + the service worker); this module is only the subtle
// chime played while the dashboard tab is open. Sound is a per-device preference,
// so it lives in localStorage. Everything fails soft.

const SOUND_PREF = "rq_admin_sound"; // "on" | "off" (default on)

/** Sound preference. Default ON (subtle). */
export function getSoundPref(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_PREF) !== "off";
}

export function setSoundPref(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_PREF, on ? "on" : "off");
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
