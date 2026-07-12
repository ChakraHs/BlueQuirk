"use client";

import dynamic from "next/dynamic";
import { MessageCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupportStrings } from "./strings";

// Lazy-load the panel: its code (and the chat logic) is only fetched the first
// time the user opens support, keeping it off the initial page load.
const SupportPanel = dynamic(() => import("./SupportPanel"), { ssr: false });

export default function SupportWidget({
  lang,
  storeName = "RedQuirk",
  logoUrl = null,
  unread = 0,
}: {
  lang: string;
  storeName?: string;
  logoUrl?: string | null;
  /** optional unread badge, wired for future live-agent / push use */
  unread?: number;
}) {
  const s = getSupportStrings(lang);
  // `mounted` = panel is in the DOM; `visible` = play the enter transition.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const open = useCallback(() => setMounted(true), []);
  const requestClose = useCallback(() => setVisible(false), []);
  const handleExited = useCallback(() => {
    setMounted(false);
    buttonRef.current?.focus();
  }, []);

  // Trigger the enter animation on the frame after the panel mounts.
  useEffect(() => {
    if (!mounted) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (mounted ? requestClose() : open())}
        aria-label={s.ui.launcherLabel}
        aria-haspopup="dialog"
        aria-expanded={mounted}
        className="fixed z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 outline-none transition-transform duration-200 ease-out hover:scale-105 hover:bg-blue-700 active:scale-95 focus-visible:ring-4 focus-visible:ring-blue-500/40
          bottom-[calc(1.25rem_+_env(safe-area-inset-bottom))] right-[calc(1.25rem_+_env(safe-area-inset-right))]"
      >
        <span className="relative flex items-center justify-center">
          {mounted ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </span>
        {!mounted && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {mounted && (
        <SupportPanel
          lang={lang}
          storeName={storeName}
          logoUrl={logoUrl}
          visible={visible}
          onRequestClose={requestClose}
          onExited={handleExited}
          launcherRef={buttonRef}
        />
      )}
    </>
  );
}
