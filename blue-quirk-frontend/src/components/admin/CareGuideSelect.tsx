"use client";

// Product-form control to attach an optional "Care & Wear" guide. Lists existing
// templates (loaded from the admin API) plus a "None" option, and links out to the
// care-guide manager to create/edit templates. Value 0 = no guide attached; a
// positive value = that template's id. Selecting a guide is optional.
import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CareGuideService, type CareGuideTemplate } from "@/services/careGuide.service";

const TYPE_LABEL: Record<string, string> = { T_SHIRT: "T-shirt", HOODIE: "Hoodie" };

export default function CareGuideSelect({
  value,
  onChange,
}: {
  value: number; // 0 = none
  onChange: (value: number) => void;
}) {
  const [templates, setTemplates] = useState<CareGuideTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    CareGuideService.list()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Care &amp; Wear guide</label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value={0}>None</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.productType ? ` (${TYPE_LABEL[t.productType] ?? t.productType})` : ""}
            </option>
          ))}
        </select>
        <Link
          href="/admin-v2/care-guides"
          target="_blank"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <ExternalLink size={14} /> Manage / new
        </Link>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        Optional. Shown on the product page after the reviews. Create or edit guides from
        “Manage / new”, then pick one here.
      </p>
      {loaded && templates.length === 0 && (
        <p className="mt-1 text-xs text-amber-600">
          No care guides yet — use “Manage / new” to create one.
        </p>
      )}
    </div>
  );
}
