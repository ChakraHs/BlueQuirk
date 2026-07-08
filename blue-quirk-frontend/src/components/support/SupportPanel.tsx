"use client";

import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import ChatComposer from "./ChatComposer";
import ChatMessages from "./ChatMessages";
import { useBodyScrollLock, useFocusTrap, useSupportChat } from "./hooks";
import { createEchoProvider } from "./provider";
import { getSupportStrings } from "./strings";

type View = "home" | "chat";

export interface SupportPanelProps {
  lang: string;
  storeName: string;
  logoUrl?: string | null;
  /** drives the enter/exit transition */
  visible: boolean;
  /** ask the widget to start closing (plays exit animation) */
  onRequestClose: () => void;
  /** called after the exit animation so the widget can unmount + restore focus */
  onExited: () => void;
  launcherRef: React.RefObject<HTMLButtonElement | null>;
}

export default function SupportPanel({
  lang,
  storeName,
  logoUrl,
  visible,
  onRequestClose,
  onExited,
  launcherRef,
}: SupportPanelProps) {
  const s = useMemo(() => getSupportStrings(lang), [lang]);
  const provider = useMemo(
    () => createEchoProvider(s.answers, s.ui.fallback),
    [s]
  );
  const chat = useSupportChat(provider, lang);

  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, {
    active: visible,
    onEscape: onRequestClose,
    restoreFocusTo: launcherRef,
  });
  useBodyScrollLock(visible);

  const startChat = (text: string, topic?: string) => {
    setView("chat");
    chat.send(text, topic);
  };

  const q = query.trim().toLowerCase();
  const filteredActions = q
    ? s.quickActions.filter((a) => a.label.toLowerCase().includes(q))
    : s.quickActions;
  const filteredSuggested = q
    ? s.suggested.filter((x) => x.label.toLowerCase().includes(q))
    : s.suggested;
  const noResults = q !== "" && filteredActions.length === 0 && filteredSuggested.length === 0;

  return (
    <>
      {/* Scrim — mobile only (desktop panel floats over the page) */}
      <div
        aria-hidden
        onClick={onRequestClose}
        className={`fixed inset-0 z-[65] bg-black/30 transition-opacity duration-300 md:hidden ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={s.ui.title}
        tabIndex={-1}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && !visible) onExited();
        }}
        className={`fixed z-[70] flex flex-col overflow-hidden bg-white shadow-2xl outline-none
          inset-x-0 bottom-0 h-[86vh] max-h-[86dvh] rounded-t-2xl
          md:inset-x-auto md:bottom-24 md:right-6 md:h-[620px] md:max-h-[calc(100dvh-8rem)] md:w-[400px] md:rounded-2xl md:border md:border-gray-200
          transition-[transform,opacity] duration-300 ease-out will-change-transform
          ${visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 md:translate-y-3"}`}
      >
        {/* ---- Header ---- */}
        <header className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white">
          {view === "chat" && (
            <button
              type="button"
              onClick={() => setView("home")}
              aria-label={s.ui.back}
              className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-1 ring-white/25">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={storeName} className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm font-bold">{storeName.charAt(0)}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{storeName}</p>
            <p className="flex items-center gap-1.5 text-xs text-white/80">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              {s.ui.title} · {s.ui.online}
            </p>
          </div>

          <button
            type="button"
            onClick={onRequestClose}
            aria-label={s.ui.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* ---- Body ---- */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-white">
          {view === "home" ? (
            <div className="px-4 py-4">
              {/* Welcome */}
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900">{s.ui.welcomeTitle}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {s.ui.welcomeBody.replace("{store}", storeName)}
                </p>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={s.ui.searchPlaceholder}
                  aria-label={s.ui.searchPlaceholder}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {noResults && (
                <p className="py-6 text-center text-sm text-gray-500">{s.ui.noResults}</p>
              )}

              {/* Quick actions */}
              {filteredActions.length > 0 && (
                <section className="mb-5">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {s.ui.quickTitle}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredActions.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => startChat(a.label, a.topic)}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98]"
                      >
                        <span className="text-base leading-none">{a.emoji}</span>
                        <span className="min-w-0 flex-1 truncate">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Suggested questions */}
              {filteredSuggested.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {s.ui.suggestedTitle}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {filteredSuggested.map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => startChat(x.label, x.topic)}
                        className="group flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3.5 py-3 text-left text-sm text-gray-700 transition hover:bg-blue-50 active:scale-[0.99]"
                      >
                        <span className="min-w-0 flex-1">{x.label}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-blue-500 rtl:rotate-180" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <ChatMessages
              messages={chat.messages}
              typing={chat.sending}
              lang={lang}
              typingLabel={s.ui.typing}
            />
          )}
        </div>

        {/* ---- Composer ---- */}
        <ChatComposer
          onSend={(text) => startChat(text)}
          disabled={chat.sending}
          placeholder={s.ui.composerPlaceholder}
          sendLabel={s.ui.send}
        />
      </div>
    </>
  );
}
