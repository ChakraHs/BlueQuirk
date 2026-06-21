"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";
import {
  DEFAULT_LANG,
  getLangCookie,
  LANGS,
  type LangCode,
  setLangCookie,
  swapLangInPath,
} from "@/lib/lang";
import { getAuthUser } from "@/lib/auth";
import { PreferenceService } from "@/services/preference.service";

export default function LanguageSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = (LANGS.find((l) => l.code === current) ?? LANGS[0]);

  // Keep the cookie in sync with the URL, and for signed-in users hydrate the
  // stored DB preference once (so the next bare "/" visit honours it).
  useEffect(() => {
    setLangCookie(active.code);
    const user = getAuthUser();
    if (!user) return;
    PreferenceService.get(user.id)
      .then((pref) => {
        if (pref?.language && pref.language !== getLangCookie()) {
          setLangCookie(pref.language);
        }
      })
      .catch(() => {});
  }, [active.code]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (code: LangCode) => {
    setOpen(false);
    if (code === active.code) return;

    setLangCookie(code);

    // Persist to the account for signed-in users (best-effort).
    const user = getAuthUser();
    if (user) {
      PreferenceService.save(user.id, code).catch(() => {});
    }

    router.push(swapLangInPath(pathname || `/${DEFAULT_LANG}`, code));
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
      >
        <Globe size={18} />
        <span className="hidden sm:inline">{active.native}</span>
        <ChevronDown size={15} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {LANGS.map((lang) => {
            const selected = lang.code === active.code;
            return (
              <li key={lang.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => choose(lang.code)}
                  dir={lang.dir}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition hover:bg-gray-50 ${
                    selected ? "font-semibold text-blue-600" : "text-gray-700"
                  }`}
                >
                  <span>{lang.native}</span>
                  {selected && <Check size={16} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
