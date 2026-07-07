"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, SupportProvider } from "./types";

let seq = 0;
const uid = () => `m_${Date.now().toString(36)}_${(seq++).toString(36)}`;

/**
 * Owns the conversation state and talks to the pluggable provider. Kept minimal
 * so re-renders only happen when the message list / sending flag actually
 * change. `sending` doubles as the "assistant is typing" signal.
 */
export function useSupportChat(provider: SupportProvider, lang: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const providerRef = useRef(provider);
  providerRef.current = provider;
  const messagesRef = useRef<ChatMessage[]>([]);
  const sendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string, topic?: string) => {
      const clean = text.trim();
      if (!clean || sendingRef.current) return;

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: clean,
        createdAt: Date.now(),
      };
      const history = messagesRef.current;
      messagesRef.current = [...history, userMsg];
      setMessages(messagesRef.current);

      sendingRef.current = true;
      setSending(true);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const reply = await providerRef.current.send(
          { text: clean, topic, history, signal: controller.signal },
          { lang }
        );
        if (controller.signal.aborted || !reply) return;
        const botMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: reply,
          createdAt: Date.now(),
        };
        messagesRef.current = [...messagesRef.current, botMsg];
        setMessages(messagesRef.current);
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        sendingRef.current = false;
        setSending(false);
      }
    },
    [lang]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    messagesRef.current = [];
    setMessages([]);
  }, []);

  // Abort any in-flight request on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  return { messages, sending, send, reset };
}

/**
 * Traps Tab focus inside `containerRef` while `active`, closes on Escape, and
 * restores focus to `restoreFocusTo` (the launcher) on teardown.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  {
    active,
    onEscape,
    restoreFocusTo,
  }: {
    active: boolean;
    onEscape: () => void;
    restoreFocusTo?: React.RefObject<HTMLElement | null>;
  }
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Capture the restore target now (the launcher button is stable) so the
    // cleanup doesn't read a possibly-changed ref.
    const restoreTarget = restoreFocusTo?.current ?? previouslyFocused;

    const focusable = () =>
      Array.from(
        container?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => el.offsetParent !== null);

    // Focus the first control after the panel has mounted.
    const raf = requestAnimationFrame(() => {
      const items = focusable();
      (items[0] ?? container)?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      restoreTarget?.focus?.();
    };
  }, [active, containerRef, onEscape, restoreFocusTo]);
}

/** Locks body scroll while `active` — only on small screens (mobile sheet). */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}
