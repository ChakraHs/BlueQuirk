"use client";

export type BarDatum = {
  label: string;
  value: number;
  /** Tailwind bg-* class for the bar fill. */
  colorClass?: string;
};

/** Horizontal bar chart for small categorical breakdowns (e.g. orders by status). */
export default function MiniBarChart({ data }: { data: BarDatum[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs font-medium text-gray-500">
            {d.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${d.colorClass ?? "bg-blue-500"}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-semibold text-gray-700">
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}
