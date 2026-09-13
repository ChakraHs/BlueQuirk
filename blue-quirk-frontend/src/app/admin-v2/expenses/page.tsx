"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Save, Wallet, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { ExpenseService, type ExpenseInput } from "@/services/expense.service";
import type { Expense } from "@/types/finance";
import { formatPrice } from "@/lib/money";

// Suggested categories; the field is still free text so new types can be added.
const CATEGORY_PRESETS = ["Ads / Marketing", "Hosting", "UGC", "Salaires", "Autre"];

const PAGE_SIZE = 20;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORY_PRESETS[0]);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await ExpenseService.list());
    } catch {
      setError("Impossible de charger les dépenses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(
    () => rows.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE),
    [rows, pageSafe]
  );

  const add = async () => {
    const amt = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) { setError("Montant invalide."); return; }
    if (!category.trim()) { setError("La catégorie est requise."); return; }
    setBusy(true);
    setError(null);
    const input: ExpenseInput = {
      amount: amt,
      category: category.trim(),
      note: note.trim() || null,
      expenseDate: date || todayISO(),
    };
    try {
      await ExpenseService.create(input);
      setAmount("");
      setNote("");
      // keep category + date for quick repeated entries
      await load();
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {
      setError("Échec de l'enregistrement de la dépense.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await ExpenseService.remove(toDelete.id);
      setRows((prev) => prev.filter((r) => r.id !== toDelete.id));
      setToDelete(null);
    } catch {
      setError("Échec de la suppression.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <PageHeader
        title="Dépenses / Coûts"
        subtitle="Enregistrez tous les coûts (pub, hosting, UGC, autre…). Ils sont déduits du profit net des commandes pour calculer le profit réel dans le tableau de bord."
      />

      {saved && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> Enregistré
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* Add form */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Plus size={16} /> Ajouter une dépense
        </h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Montant (DH)</span>
            <input
              type="number" min={0} step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Type</span>
            <input
              list="expense-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ads / Marketing"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            <datalist id="expense-categories">
              {CATEGORY_PRESETS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Note (optionnel)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Campagne Instagram…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {CATEGORY_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                category === c
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {c}
            </button>
          ))}
          <button
            onClick={add}
            disabled={busy}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Ajouter
          </button>
        </div>
      </div>

      {/* Total */}
      {!loading && rows.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <span className="text-gray-600">{rows.length} dépense(s)</span>
          <span className="font-semibold text-gray-900">Total : {formatPrice(total)}</span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Wallet className="mx-auto mb-2 text-gray-300" size={28} />
          <p className="text-sm text-gray-500">Aucune dépense enregistrée pour le moment.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 tabular-nums text-gray-700">{e.expenseDate}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{e.note || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-900">{formatPrice(e.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setToDelete(e)}
                      className="rounded p-1.5 text-gray-500 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>{(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, rows.length)} sur {rows.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40">Précédent</button>
            <span className="px-2 tabular-nums">{pageSafe} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40">Suivant</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer la dépense"
        message={toDelete ? `Supprimer « ${toDelete.category} — ${formatPrice(toDelete.amount)} » du ${toDelete.expenseDate} ?` : ""}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
