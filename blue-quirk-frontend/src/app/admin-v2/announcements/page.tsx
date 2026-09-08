"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Megaphone, ArrowUp, ArrowDown, Loader2, Save, CheckCircle2,
} from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import {
  AnnouncementService,
  type Announcement,
  type BarSettings,
  type AnnouncementAnimation,
} from "@/services/announcement.service";

type StatusFilter = "ALL" | "ACTIVE" | "SCHEDULED" | "EXPIRED" | "DISABLED";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SCHEDULED: "bg-amber-100 text-amber-700",
  EXPIRED: "bg-slate-200 text-slate-600",
  DISABLED: "bg-slate-200 text-slate-500",
};

export default function AnnouncementsPage() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [bar, setBar] = useState<BarSettings>({
    enabled: true, bgColor: null, textColor: null, animation: "FADE", rotationSeconds: 5,
  });
  const [savingBar, setSavingBar] = useState(false);
  const [barSaved, setBarSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<Announcement | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [list, settings] = await Promise.all([
        AnnouncementService.list(),
        AnnouncementService.getBarSettings(),
      ]);
      setRows(list);
      setBar(settings);
    } catch {
      setError("Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patchBar = (patch: Partial<BarSettings>) => setBar((b) => ({ ...b, ...patch }));

  const saveBar = async () => {
    setSavingBar(true);
    setError(null);
    try {
      const updated = await AnnouncementService.setBarSettings(bar);
      setBar(updated);
      setBarSaved(true);
      setTimeout(() => setBarSaved(false), 2000);
    } catch {
      setError("Failed to save the bar settings.");
    } finally {
      setSavingBar(false);
    }
  };

  const toggleActive = async (a: Announcement) => {
    setBusy(true);
    try {
      await AnnouncementService.setActive(a.id, !a.active);
      await load();
    } catch {
      setError("Failed to update the announcement.");
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next); // optimistic
    setBusy(true);
    try {
      await AnnouncementService.reorder(next.map((r) => r.id));
      await load();
    } catch {
      setError("Failed to reorder.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await AnnouncementService.remove(toDelete.id);
      setToDelete(null);
      await load();
    } catch {
      setError("Failed to delete the announcement.");
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "ALL" && r.status !== filter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [r.messageFr, r.messageEn, r.messageAr].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  const reorderable = filter === "ALL" && !search.trim();

  return (
    <div>
      <PageHeader title="Announcement Bar" subtitle="Manage the rotating messages at the top of the storefront.">
        <Link href="/admin-v2/announcements/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black">
          <Plus size={16} /> Add announcement
        </Link>
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Global bar settings */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Bar settings</p>
            <p className="text-xs text-gray-500">
              Global look &amp; behavior. Individual announcements can still override their own colors and duration.
            </p>
          </div>
          <button
            type="button"
            onClick={() => patchBar({ enabled: !bar.enabled })}
            title={bar.enabled ? "Bar is on" : "Bar is off"}
            className={`inline-flex h-9 w-24 shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition ${
              bar.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
            }`}
          >
            {bar.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            {bar.enabled ? "ON" : "OFF"}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Background color</label>
            <ColorField value={bar.bgColor} fallback="#111827" onChange={(v) => patchBar({ bgColor: v })} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Text color</label>
            <ColorField value={bar.textColor} fallback="#ffffff" onChange={(v) => patchBar({ textColor: v })} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Transition</label>
            <select value={bar.animation} onChange={(e) => patchBar({ animation: e.target.value as AnnouncementAnimation })}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option value="FADE">Fade (one at a time)</option>
              <option value="SLIDE">Slide (one at a time)</option>
              <option value="CAROUSEL">Carousel (continuous)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Rotation speed (seconds)</label>
            <input type="number" min={2} max={30} step={1} value={bar.rotationSeconds}
              onChange={(e) => patchBar({ rotationSeconds: Math.max(2, Math.min(30, Number(e.target.value) || 5)) })}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            <p className="mt-1 text-[11px] text-gray-400">
              {bar.animation === "CAROUSEL" ? "Controls the scroll speed." : "Time each message is shown."}
            </p>
          </div>
        </div>

        {/* Live preview of the bar chrome */}
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-gray-500">Preview</p>
          <div className="flex min-h-[34px] items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-[13px] font-medium"
            style={{ backgroundColor: bar.bgColor || "#111827", color: bar.textColor || "#ffffff" }}>
            🚚 {rows.find((r) => r.status === "ACTIVE")?.messageFr ?? "Your announcement preview"}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={saveBar} disabled={savingBar}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60">
            {savingBar ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {savingBar ? "Saving…" : "Save bar settings"}
          </button>
          {barSaved && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 size={15} /> Saved</span>
          )}
        </div>
      </div>

      {/* Filters */}
      {!loading && rows.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["ALL", "ACTIVE", "SCHEDULED", "EXPIRED", "DISABLED"] as StatusFilter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
            className="ml-auto w-48 rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Megaphone className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">No announcements yet.</p>
          <Link href="/admin-v2/announcements/new" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
            Create your first announcement
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Announcement</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((a) => {
                const realIndex = rows.findIndex((r) => r.id === a.id);
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => move(realIndex, -1)} disabled={busy || !reorderable || realIndex === 0}
                          title="Move up" className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30">
                          <ArrowUp size={14} />
                        </button>
                        <button onClick={() => move(realIndex, 1)} disabled={busy || !reorderable || realIndex === rows.length - 1}
                          title="Move down" className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30">
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin-v2/announcements/${a.id}`} className="font-medium text-gray-800 hover:text-blue-600">
                        {a.messageFr}
                      </Link>
                      {a.link && <p className="text-xs text-gray-400">→ {a.link}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.type.charAt(0) + a.type.slice(1).toLowerCase().replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin-v2/announcements/${a.id}`} title="Edit" className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"><Pencil size={15} /></Link>
                        <button onClick={() => toggleActive(a)} disabled={busy} title={a.active ? "Disable" : "Enable"} className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40">
                          {a.active ? <ToggleRight size={15} className="text-emerald-600" /> : <ToggleLeft size={15} />}
                        </button>
                        <button onClick={() => setToDelete(a)} disabled={busy} title="Delete" className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!reorderable && rows.length > 1 && !loading && (
        <p className="mt-2 text-xs text-gray-400">Clear the filter and search to reorder announcements.</p>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete announcement"
        message={`Delete "${toDelete?.messageFr}"? This cannot be undone.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

/** A hex color input: native swatch + text field, with a "default" (null) option. */
function ColorField({
  value, fallback, onChange,
}: {
  value: string | null;
  fallback: string;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || fallback}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-gray-300 bg-white p-0.5"
        aria-label="Pick color"
      />
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.trim() || null)}
        placeholder={`${fallback} (default)`}
        className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
