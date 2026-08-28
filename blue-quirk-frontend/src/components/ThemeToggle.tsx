"use client";

// Compact theme switcher for the header. A single icon button that cycles
// Light → Dark → System, showing the icon of the current preference. Self-
// contained: it reads/writes through lib/theme (localStorage + <html> class) and
// stays in sync with any other toggle on the page via subscribeTheme. Renders a
// stable placeholder until mounted to avoid a hydration mismatch (the server has
// no access to the persisted preference).

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  type Theme,
  getStoredTheme,
  setTheme as persistTheme,
  subscribeTheme,
} from "@/lib/theme";

const ORDER: Theme[] = ["light", "dark", "system"];

const META: Record<Theme, { icon: typeof Sun; label: Record<string, string> }> = {
  light: { icon: Sun, label: { fr: "Thème clair", ar: "الوضع الفاتح", en: "Light theme" } },
  dark: { icon: Moon, label: { fr: "Thème sombre", ar: "الوضع الداكن", en: "Dark theme" } },
  system: { icon: Monitor, label: { fr: "Thème système", ar: "وضع النظام", en: "System theme" } },
};

export default function ThemeToggle({
  lang = "fr",
  className = "",
}: {
  lang?: string;
  className?: string;
}) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getStoredTheme());
    setMounted(true);
    return subscribeTheme(() => setThemeState(getStoredTheme()));
  }, []);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    persistTheme(next);
    setThemeState(next);
  };

  const localize = (l: Record<string, string>) => l[lang] ?? l.en;
  const { icon: Icon, label } = META[theme];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={localize(label)}
      title={localize(label)}
      className={`flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 ${className}`}
    >
      {/* Before mount, show a neutral icon so SSR and first client render match. */}
      {mounted ? <Icon size={19} /> : <Monitor size={19} />}
    </button>
  );
}
