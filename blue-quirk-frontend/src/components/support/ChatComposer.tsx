"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MAX_MESSAGE_LENGTH } from "./types";

export default function ChatComposer({
  onSend,
  disabled = false,
  placeholder,
  sendLabel,
  maxLength = MAX_MESSAGE_LENGTH,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder: string;
  sendLabel: string;
  maxLength?: number;
}) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  // On touch devices Enter should insert a newline (the on-screen keyboard has a
  // dedicated return key); Enter-to-send is a desktop affordance only.
  const coarsePointer = useRef(false);
  useEffect(() => {
    coarsePointer.current =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;
  }, []);

  // Auto-grow the textarea up to a few lines.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

  const submit = () => {
    const clean = value.trim();
    if (!clean || disabled) return;
    onSend(clean);
    setValue("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !coarsePointer.current) {
      e.preventDefault();
      submit();
    }
  };

  const nearLimit = value.length > maxLength * 0.8;
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-gray-100 bg-white px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2">
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-[120px] min-h-[42px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label={sendLabel}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-[18px] w-[18px]" />
        </button>
      </div>
      {nearLimit && (
        <div className="px-1 pt-1 text-right text-[11px] text-gray-400">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
}
