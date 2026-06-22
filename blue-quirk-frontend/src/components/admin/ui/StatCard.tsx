import type { LucideIcon } from "lucide-react";

type Accent = "blue" | "green" | "amber" | "violet" | "rose" | "slate";

const ACCENTS: Record<Accent, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
};

type Props = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: Accent;
  hint?: string;
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  hint,
}: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            {value}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ACCENTS[accent]}`}
        >
          <Icon size={20} />
        </span>
      </div>
      {hint && <p className="mt-3 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
