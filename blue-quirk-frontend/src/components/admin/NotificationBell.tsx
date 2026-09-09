"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Package, Volume2, VolumeX, Monitor } from "lucide-react";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import type { AdminNotification } from "@/services/notifications";
import { getSoundPref, setSoundPref } from "@/lib/adminNotify";
import {
  disablePush,
  enablePush,
  isIOS,
  isPushEnabled,
  isStandalone,
  pushSupported,
} from "@/lib/webPush";

/** Compact relative time ("Just now", "5m", "3h", "2d"), else a short date. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 45) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const router = useRouter();
  const { items, unread, connected, markRead, markAll } = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Device preferences — hydrated on mount to avoid SSR mismatch.
  const [soundPref, setSoundPrefState] = useState(true);
  // Web Push (OS notification) state for this device.
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushNote, setPushNote] = useState<string | undefined>(undefined);
  const [supported, setSupported] = useState(true);
  const [insecure, setInsecure] = useState(false);
  // iOS requires the site be installed to the Home Screen (Safari) before any
  // browser notifications are available — Chrome/other iOS browsers never can.
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);

  useEffect(() => {
    setSoundPrefState(getSoundPref());
    setInsecure(typeof window !== "undefined" && !window.isSecureContext);
    setIosNeedsInstall(isIOS() && !isStandalone());
    const canPush = pushSupported();
    setSupported(canPush);
    if (canPush) {
      isPushEnabled()
        .then(setPushOn)
        .catch(() => {});
    }
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openOrder = useCallback(
    (n: AdminNotification) => {
      if (!n.read) markRead(n.id);
      setOpen(false);
      if (n.orderId != null) router.push(`/admin-v2/orders/${n.orderId}`);
    },
    [markRead, router]
  );

  const togglePush = useCallback(async () => {
    if (pushBusy) return;
    setPushBusy(true);
    setPushNote(undefined);
    try {
      if (!pushOn) {
        // Enabling may prompt for OS permission (asked only here, on a click,
        // and never re-asked once decided) then subscribes to Web Push.
        const res = await enablePush();
        if (res === "enabled") {
          setPushOn(true);
        } else {
          setPushOn(false);
          setPushNote(
            res === "denied"
              ? "Blocked in browser settings"
              : res === "not-configured"
              ? "Push isn't set up on the server"
              : res === "unsupported"
              ? "Not supported on this browser"
              : "Couldn't enable — please try again"
          );
        }
      } else {
        await disablePush();
        setPushOn(false);
      }
    } finally {
      setPushBusy(false);
    }
  }, [pushBusy, pushOn]);

  const toggleSound = useCallback(() => {
    const next = !soundPref;
    setSoundPref(next);
    setSoundPrefState(next);
  }, [soundPref]);

  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-[18px] text-white ring-2 ring-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Dim backdrop on phones so the panel reads as a sheet; tap to close. */}
          <div
            className="fixed inset-0 z-30 bg-black/20 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed left-3 right-3 top-[68px] z-40 flex max-h-[80vh] w-auto flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:max-h-none sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              <span
                title={connected ? "Live — connected" : "Reconnecting…"}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    connected ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                {connected ? "Live" : "Offline"}
              </span>
              {unread > 0 && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                  {unread} unread
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto sm:max-h-96 sm:flex-none">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell size={24} className="text-gray-300" />
                <p className="text-sm font-medium text-gray-500">You&apos;re all caught up</p>
                <p className="text-xs text-gray-400">New orders will appear here in real time.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => openOrder(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                        n.read ? "" : "bg-blue-50/50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          n.read ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        <Package size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-gray-900">
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="unread" />
                          )}
                        </span>
                        {n.message && (
                          <span className="mt-0.5 block truncate text-xs text-gray-600">
                            {n.message}
                          </span>
                        )}
                        <span className="mt-0.5 block text-[11px] text-gray-400">
                          {timeAgo(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Device preferences */}
          <div className="space-y-1 border-t border-gray-100 bg-gray-50/60 px-3 py-2">
            <PrefRow
              icon={<Monitor size={15} />}
              label="Desktop & mobile notifications"
              hint={
                insecure
                  ? "Needs HTTPS on this device"
                  : iosNeedsInstall
                  ? "iPhone: Safari → Share → Add to Home Screen"
                  : !supported
                  ? "Not supported on this browser"
                  : pushNote
              }
              on={pushOn}
              disabled={pushBusy || insecure || iosNeedsInstall || !supported}
              onToggle={togglePush}
            />
            <PrefRow
              icon={soundPref ? <Volume2 size={15} /> : <VolumeX size={15} />}
              label="New order sound"
              on={soundPref}
              onToggle={toggleSound}
            />
          </div>
          </div>
        </>
      )}
    </div>
  );
}

function PrefRow({
  icon,
  label,
  hint,
  on,
  disabled,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md px-1 py-1.5">
      <span className="flex items-center gap-2 text-xs font-medium text-gray-700">
        <span className="text-gray-500">{icon}</span>
        <span className="flex flex-col">
          {label}
          {hint && <span className="text-[10px] font-normal text-gray-400">{hint}</span>}
        </span>
      </span>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          on ? "bg-blue-600" : "bg-gray-300"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
