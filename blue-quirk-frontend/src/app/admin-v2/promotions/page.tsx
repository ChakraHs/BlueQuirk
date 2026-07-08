"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Plus, Pencil, Trash2, Copy, Eye, ToggleLeft, ToggleRight,
  BadgePercent, ChevronLeft, ChevronRight, ArrowUpDown, TicketPercent,
  TrendingUp, Wallet, Ticket,
} from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { formatPrice } from "@/lib/money";
import {
  PromotionService, type PromotionSummary, type PromotionStats,
  type PromotionStatus, type DiscountType, type ListParams,
} from "@/services/promotion.service";

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<PromotionStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  DISABLED: "bg-slate-200 text-slate-600",
  EXPIRED: "bg-rose-100 text-rose-700",
  EXHAUSTED: "bg-amber-100 text-amber-700",
};

const TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: "Percentage",
  FIXED_AMOUNT: "Fixed amount",
  FREE_SHIPPING: "Free shipping",
  BUY_X_GET_Y: "Buy X get Y",
};

function StatusPill({ status }: { status: PromotionStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type SortKey = "createdAt" | "name" | "code" | "usageCount" | "endDate" | "startDate";

export default function PromotionsPage() {
  const [rows, setRows] = useState<PromotionSummary[]>([]);
  const [stats, setStats] = useState<PromotionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<DiscountType | "">("");
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [toDelete, setToDelete] = useState<PromotionSummary | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const params: ListParams = useMemo(
    () => ({
      page, size: PAGE_SIZE,
      search: search.trim() || undefined,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      sortBy, sortDir,
    }),
    [page, search, statusFilter, typeFilter, sortBy, sortDir]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, s] = await Promise.all([
        PromotionService.list(params),
        PromotionService.stats().catch(() => null),
      ]);
      setRows(res.content);
      setTotalPages(Math.max(1, res.totalPages));
      setTotalElements(res.totalElements);
      if (s) setStats(s);
      setSelected(new Set());
    } catch {
      setError("Failed to load promotions.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); setSearch(searchInput); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
    setPage(0);
  };

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected(allOnPageSelected ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const doDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await PromotionService.remove(toDelete.id);
      setToDelete(null);
      await load();
    } catch {
      setError("Failed to delete promotion.");
    } finally {
      setBusy(false);
    }
  };

  const doToggleActive = async (p: PromotionSummary) => {
    setBusy(true);
    try {
      await PromotionService.setActive(p.id, !p.active);
      await load();
    } catch {
      setError("Failed to update promotion.");
    } finally {
      setBusy(false);
    }
  };

  const doDuplicate = async (p: PromotionSummary) => {
    setBusy(true);
    try {
      await PromotionService.duplicate(p.id);
      await load();
    } catch {
      setError("Failed to duplicate promotion.");
    } finally {
      setBusy(false);
    }
  };

  const bulkSetActive = async (active: boolean) => {
    setBusy(true);
    try {
      await PromotionService.bulkSetActive([...selected], active);
      await load();
    } catch {
      setError("Bulk update failed.");
    } finally {
      setBusy(false);
    }
  };

  const doBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await PromotionService.bulkDelete([...selected]);
      setConfirmBulkDelete(false);
      await load();
    } catch {
      setError("Bulk delete failed.");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Promotions" subtitle="Coupons, discounts and campaigns.">
        <Link
          href="/admin-v2/promotions/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
        >
          <Plus size={16} /> New promotion
        </Link>
      </PageHeader>

      {/* Statistics */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active promotions" value={stats.activePromotions} icon={TicketPercent} accent="green" hint={`${stats.totalPromotions} total`} />
          <StatCard label="Coupon redemptions" value={stats.totalRedemptions} icon={Ticket} accent="blue" />
          <StatCard label="Discount given" value={formatPrice(stats.totalDiscountGiven)} icon={Wallet} accent="amber" hint={`Avg ${formatPrice(stats.averageDiscount)}/order`} />
          <StatCard label="Revenue w/ coupons" value={formatPrice(stats.totalRevenueGenerated)} icon={TrendingUp} accent="violet" />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name or code…"
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setPage(0); setStatusFilter(e.target.value); }}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
        >
          <option value="">All statuses</option>
          {(["ACTIVE", "SCHEDULED", "DISABLED", "EXPIRED", "EXHAUSTED"] as PromotionStatus[]).map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setPage(0); setTypeFilter(e.target.value as DiscountType | ""); }}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
        >
          <option value="">All types</option>
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED_AMOUNT">Fixed amount</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-blue-800">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => bulkSetActive(true)} disabled={busy} className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 font-medium text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-50">
              <ToggleRight size={14} /> Enable
            </button>
            <button onClick={() => bulkSetActive(false)} disabled={busy} className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">
              <ToggleLeft size={14} /> Disable
            </button>
            <button onClick={() => setConfirmBulkDelete(true)} disabled={busy} className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <BadgePercent className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">No promotions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300" />
                </th>
                <SortableTh label="Promotion" active={sortBy === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
                <SortableTh label="Code" active={sortBy === "code"} dir={sortDir} onClick={() => toggleSort("code")} />
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Discount</th>
                <SortableTh label="Usage" active={sortBy === "usageCount"} dir={sortDir} onClick={() => toggleSort("usageCount")} />
                <th className="px-4 py-3 text-left">Limit</th>
                <SortableTh label="Start" active={sortBy === "startDate"} dir={sortDir} onClick={() => toggleSort("startDate")} />
                <SortableTh label="End" active={sortBy === "endDate"} dir={sortDir} onClick={() => toggleSort("endDate")} />
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created by</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50 ${selected.has(p.id) ? "bg-blue-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4 rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin-v2/promotions/${p.id}`} className="font-medium text-gray-800 hover:text-blue-600">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold text-gray-700">{p.code}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[p.discountType]}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.discountLabel}</td>
                  <td className="px-4 py-3 text-gray-700">{p.usageCount}</td>
                  <td className="px-4 py-3 text-gray-600">{p.maxGlobalUsage == null ? "∞" : p.maxGlobalUsage}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(p.startDate)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(p.endDate)}</td>
                  <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.createdByEmail ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin-v2/promotions/${p.id}`} title="View / edit" className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"><Eye size={15} /></Link>
                      <Link href={`/admin-v2/promotions/${p.id}`} title="Edit" className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"><Pencil size={15} /></Link>
                      <button onClick={() => doDuplicate(p)} disabled={busy} title="Duplicate" className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40"><Copy size={15} /></button>
                      <button onClick={() => doToggleActive(p)} disabled={busy} title={p.active ? "Disable" : "Enable"} className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40">
                        {p.active ? <ToggleRight size={15} className="text-emerald-600" /> : <ToggleLeft size={15} />}
                      </button>
                      <button onClick={() => setToDelete(p)} disabled={busy} title="Delete" className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && rows.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>{totalElements} promotion{totalElements === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40"><ChevronLeft size={14} /> Prev</button>
            <span className="px-1">Page {page + 1} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40">Next <ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete promotion"
        message={`Delete "${toDelete?.name}" (${toDelete?.code})? Existing orders keep their recorded discount, but the coupon can no longer be used. This cannot be undone.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete promotions"
        message={`Delete ${selected.size} selected promotion(s)? This cannot be undone.`}
        confirmLabel="Delete all"
        busy={bulkDeleting}
        onConfirm={doBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </div>
  );
}

function SortableTh({
  label, active, dir, onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-4 py-3 text-left">
      <button onClick={onClick} className={`inline-flex items-center gap-1 uppercase tracking-wider ${active ? "text-gray-900" : "text-gray-500"} hover:text-gray-900`}>
        {label}
        <ArrowUpDown size={12} className={active ? "opacity-100" : "opacity-40"} />
        {active && <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
