"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { t } from "@/lib/i18n";

const OPTIONS = ["relevance", "bestselling", "newest"] as const;
type SortOption = (typeof OPTIONS)[number];

/**
 * Category ordering selector. Writes the chosen order to the `?sort=` query and
 * resets pagination to page 1, so the server component re-fetches the listing in
 * the new order. `relevance` (the default) is kept implicit for clean URLs.
 */
export default function CategorySortControl({
  lang,
  current,
}: {
  lang: string;
  current: SortOption;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "relevance") params.delete("sort");
    else params.set("sort", value);
    params.delete("page"); // new ordering starts from the first page
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-500">
      <span className="whitespace-nowrap">{t(lang, "category.sort.label")}</span>
      <span className="relative">
        <select
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm font-medium text-gray-900 transition hover:border-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        >
          {OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(lang, `category.sort.${opt}`)}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 rtl:left-2.5 rtl:right-auto"
          aria-hidden
        />
      </span>
    </label>
  );
}
