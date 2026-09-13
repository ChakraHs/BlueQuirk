"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, MapPin, ChevronDown } from "lucide-react";
import { fetchCities, type PublicCity } from "@/services/city.service";
import { formatPrice } from "@/lib/money";

/**
 * Ville selector for checkout: an autocomplete combobox that suggests from the
 * admin-managed cities list but still lets the customer type a city that isn't on
 * it (so a COD order is never blocked by a missing city). When no cities are
 * configured it degrades to a plain text input. The chosen city's shipping fee is
 * resolved server-side (the cart quote), so this component only owns the name.
 */
// Cap the suggestion list so a large cities list stays a tidy dropdown: show the
// first 50 matches (the rest are reachable by typing to narrow the search).
const MAX_SUGGESTIONS = 50;

const FREE_LABEL: Record<string, string> = { fr: "Gratuit", en: "Free", ar: "مجاني" };

export default function CitySelect({
  label,
  value,
  onChange,
  onBlur,
  error,
  required,
  placeholder,
  lang = "fr",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  lang?: string;
}) {
  const [cities, setCities] = useState<PublicCity[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetchCities().then((c) => {
      if (alive) setCities(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Suggestions: substring match (case/diacritics-insensitive), capped for a tidy list.
  const matches = useMemo(() => {
    const q = normalize(value);
    const list = q
      ? cities.filter((c) => normalize(c.name).includes(q))
      : cities;
    return list.slice(0, MAX_SUGGESTIONS);
  }, [cities, value]);

  const feeLabel = (fee: number) =>
    fee > 0 ? formatPrice(fee, lang) : (FREE_LABEL[lang] ?? FREE_LABEL.fr);

  // Close the dropdown on an outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const hasSuggestions = cities.length > 0 && matches.length > 0;

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !hasSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (matches[highlight]) {
        e.preventDefault();
        choose(matches[highlight].name);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef}>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <MapPin size={18} />
        </span>
        <input
          type="text"
          role="combobox"
          aria-expanded={open && hasSuggestions}
          aria-controls="city-suggestions"
          aria-autocomplete="list"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={!!error}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          className={`w-full rounded-lg border bg-surface py-2.5 pl-10 pr-9 text-sm text-gray-900 placeholder:text-gray-400 transition focus:outline-none focus:ring-2 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
              : "border-gray-300 focus:border-blue-600 focus:ring-blue-600/20"
          }`}
        />
        {cities.length > 0 && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <ChevronDown size={18} />
          </span>
        )}

        {open && hasSuggestions && (
          <ul
            id="city-suggestions"
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-surface py-1 shadow-lg"
          >
            {matches.map((c, i) => (
              <li key={c.name} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  // onMouseDown (not onClick) so it fires before the input blur.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(c.name);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                    i === highlight ? "bg-blue-50 text-blue-700" : "text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  <span className={`shrink-0 text-xs ${c.shippingFee > 0 ? "text-gray-500" : "text-emerald-600"}`}>
                    {feeLabel(c.shippingFee)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

/** Lowercase + strip accents so "Salé" matches "sale". */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .trim();
}
