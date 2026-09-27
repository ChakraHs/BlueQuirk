"use client";

// Structured material-composition editor for the admin product form. The admin
// adds one or more materials, each with a percentage (Cotton 100%, or Cotton 67%
// + Polyester 33%). Percentages must each be positive and total exactly 100 — the
// live total below the rows shows validity; the page also guards on submit via the
// exported `isCompositionValid`. Composition is stored as structured data (a list
// of { material, percentage }), not a free-text string.
import { Plus, Trash2, Check, AlertCircle } from "lucide-react";
import { MaterialComponent } from "@/types/product";

// The materials the shop supports today. This is the single extension point on
// the frontend: adding a material here (plus its localized label in lib/i18n and
// the backend MaterialType enum) is all that's needed to offer a new one.
export const MATERIAL_OPTIONS = [
  { value: "COTTON", label: "Cotton" },
  { value: "POLYESTER", label: "Polyester" },
] as const;

export function compositionTotal(value: MaterialComponent[]): number {
  return value.reduce((sum, c) => sum + (Number(c.percentage) || 0), 0);
}

/** True when the composition is non-empty, every percentage is a positive whole
 *  number, and the percentages total exactly 100. */
export function isCompositionValid(value: MaterialComponent[]): boolean {
  if (!value.length) return false;
  if (value.some((c) => !Number.isInteger(Number(c.percentage)) || Number(c.percentage) <= 0)) {
    return false;
  }
  return compositionTotal(value) === 100;
}

export default function MaterialCompositionEditor({
  value,
  onChange,
}: {
  value: MaterialComponent[];
  onChange: (value: MaterialComponent[]) => void;
}) {
  const total = compositionTotal(value);
  const valid = isCompositionValid(value);

  const update = (index: number, patch: Partial<MaterialComponent>) =>
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const remove = (index: number) =>
    onChange(value.filter((_, i) => i !== index));

  const add = () => {
    // Default the new row to the first material not yet used (so a blend picks
    // Polyester after Cotton), and to 100% when it's the only row.
    const used = new Set(value.map((c) => c.material));
    const next = MATERIAL_OPTIONS.find((o) => !used.has(o.value))?.value ?? "COTTON";
    onChange([...value, { material: next, percentage: value.length === 0 ? 100 : 0 }]);
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Materials</label>

      <div className="space-y-2">
        {value.map((component, index) => (
          <div key={index} className="flex items-center gap-2">
            <select
              value={component.material}
              onChange={(e) => update(index, { material: e.target.value })}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
            >
              {MATERIAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="relative w-28 shrink-0">
              <input
                type="number"
                min={1}
                max={100}
                value={component.percentage}
                onChange={(e) =>
                  update(index, { percentage: Number(e.target.value) })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-7 text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                %
              </span>
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={value.length === 1}
              aria-label="Remove material"
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-gray-300 text-gray-500 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 transition hover:text-black"
        >
          <Plus className="size-4" /> Add material
        </button>
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
            valid ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {valid ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
          Total: {total}%
        </span>
      </div>
      {!valid && (
        <p className="mt-1 text-xs text-red-500">
          Each percentage must be positive and the total must equal 100%.
        </p>
      )}
    </div>
  );
}
