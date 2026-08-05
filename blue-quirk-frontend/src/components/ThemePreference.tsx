"use client";

// Full 3-way theme control (Light / Dark / System) for the account preferences
// page — a labelled segmented control, the discoverable counterpart to the
// header's compact ThemeToggle. Shares the same persistence layer (lib/theme),
// so changing it here instantly updates the header toggle and every open tab.

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  type Theme,
  THEMES,
  getStoredTheme,
  setTheme as persistTheme,
  subscribeTheme,
} from "@/lib/theme";

const OPTIONS: { value: Theme; icon: typeof Sun; label: string; hint: string }[] = [
  { value: "light", icon: Sun, label: "Light", hint: "Always light" },
  { value: "dark", icon: Moon, label: "Dark", hint: "Always dark" },
  { value: "system", icon: Monitor, label: "System", hint: "Match your device" },
];

export default function ThemePreference() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getStoredTheme());
    setMounted(true);
    return subscribeTheme(() => setThemeState(getStoredTheme()));
  }, []);

  const choose = (value: Theme) => {
    persistTheme(value);
    setThemeState(value);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="grid grid-cols-3 gap-2 sm:max-w-md"
    >
      {OPTIONS.map(({ value, icon: Icon, label, hint }) => {
        // `mounted` gate: keep every option visually unselected on the server /
        // first paint so hydration matches, then reflect the real preference.
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(value)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-center transition ${
              active
                ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/20"
                : "border-gray-200 bg-surface text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Icon size={22} />
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-[11px] text-gray-400">{hint}</span>
          </button>
        );
      })}
    </div>
  );
}

// Re-exported for callers that want the raw list (kept in sync with THEMES).
export { THEMES };
