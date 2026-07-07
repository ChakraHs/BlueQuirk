"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ChatMessage } from "./types";

export default function ChatMessages({
  messages,
  typing,
  lang,
  typingLabel,
}: {
  messages: ChatMessage[];
  typing: boolean;
  lang: string;
  typingLabel: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" }),
    [lang]
  );

  // Auto-scroll to the newest message / typing indicator.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  return (
    <div className="flex flex-col gap-3 px-4 py-4" aria-live="polite" aria-relevant="additions">
      {messages.map((m) => {
        const isUser = m.role === "user";
        return (
          <div
            key={m.id}
            className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                isUser
                  ? "rounded-br-md bg-blue-600 text-white"
                  : "rounded-bl-md bg-gray-100 text-gray-800"
              }`}
            >
              {m.content}
            </div>
            <span className="mt-1 px-1 text-[11px] text-gray-400">
              {timeFmt.format(new Date(m.createdAt))}
            </span>
          </div>
        );
      })}

      {typing && (
        <div className="flex items-start" aria-label={typingLabel} role="status">
          <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-gray-100 px-3.5 py-3">
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
