"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, Save, X,
  Upload, MapPin, CheckCircle2,
} from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { CityAdminService, type AdminCity, type CityInput } from "@/services/cityAdmin.service";

type FormState = {
  id: number | null;
  name: string;
  shippingFee: string;
  realShippingCost: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  id: null, name: "", shippingFee: "", realShippingCost: "", active: true,
};

const PAGE_SIZE = 20;

export default function CitiesPage() {
  const [rows, setRows] = useState<AdminCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);

  const [toDelete, setToDelete] = useState<AdminCity | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await CityAdminService.list());
    } catch {
      setError("Impossible de charger les villes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((c) => c.name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE),
    [filtered, pageSafe]
  );

  // Reset to the first page whenever the search changes (or the list shrinks).
  useEffect(() => { setPage(1); }, [search]);

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openAdd = () => { setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (c: AdminCity) => {
    setForm({
      id: c.id, name: c.name,
      shippingFee: String(c.shippingFee),
      realShippingCost: String(c.realShippingCost),
      active: c.active,
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (!form.name.trim()) { setError("Le nom de la ville est requis."); return; }
    setBusy(true);
    setError(null);
    const input: CityInput = {
      name: form.name.trim(),
      shippingFee: num(form.shippingFee),
      realShippingCost: num(form.realShippingCost),
      active: form.active,
    };
    try {
      if (form.id == null) await CityAdminService.create(input);
      else await CityAdminService.update(form.id, input);
      setFormOpen(false);
      setForm(EMPTY_FORM);
      await load();
      flash();
    } catch (e) {
      setError(apiError(e) ?? "Échec de l'enregistrement de la ville.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (c: AdminCity) => {
    setBusy(true);
    try {
      await CityAdminService.update(c.id, { active: !c.active });
      setRows((prev) => prev.map((r) => (r.id === c.id ? { ...r, active: !r.active } : r)));
    } catch {
      setError("Échec de la mise à jour.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await CityAdminService.remove(toDelete.id);
      setRows((prev) => prev.filter((r) => r.id !== toDelete.id));
      setToDelete(null);
    } catch {
      setError("Échec de la suppression.");
    } finally {
      setBusy(false);
    }
  };

  const runBulk = async () => {
    setBulkBusy(true);
    setBulkError(null);
    try {
      const entries = parseBulk(bulkText);
      if (entries.length === 0) {
        setBulkError("Aucune ville valide détectée. Format : Nom, prix client, coût réel (une par ligne) ou un tableau JSON.");
        return;
      }
      const n = await CityAdminService.bulkImport(entries);
      setBulkText("");
      setBulkOpen(false);
      await load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setError(`${n} ville(s) importée(s).`);
      setTimeout(() => setError(null), 4000);
    } catch (e) {
      setBulkError(apiError(e) ?? "Échec de l'import.");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <PageHeader
        title="Villes & livraison"
        subtitle="Prix de livraison par ville : le prix client (affiché et ajouté au total) et le coût réel (interne, pour le profit). Les villes hors liste utilisent les valeurs par défaut des Réglages."
      >
        <button
          onClick={() => setBulkOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <Upload size={16} /> Import en masse
        </button>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={16} /> Ajouter une ville
        </button>
      </PageHeader>

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

      {/* Bulk import panel */}
      {bulkOpen && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Import en masse</h3>
          <p className="mt-1 text-xs text-gray-500">
            Une ville par ligne : <code>Nom, prix client, coût réel</code> — ou collez un tableau JSON
            d&apos;objets <code>{`{ "name", "shippingFee", "realShippingCost" }`}</code>. Les villes existantes
            (même nom) sont mises à jour.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={7}
            placeholder={"Casablanca, 30, 20\nRabat, 35, 22\nMarrakech, 40, 28"}
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
          {bulkError && <p className="mt-2 text-sm text-rose-600">{bulkError}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => { setBulkOpen(false); setBulkError(null); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={runBulk}
              disabled={bulkBusy || !bulkText.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {bulkBusy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Importer
            </button>
          </div>
        </div>
      )}

      {/* Add / edit form */}
      {formOpen && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {form.id == null ? "Nouvelle ville" : "Modifier la ville"}
            </h3>
            <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-xs font-medium text-gray-600">Ville</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Casablanca"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">Prix client (DH)</span>
              <input
                type="number" min={0} step="0.01"
                value={form.shippingFee}
                onChange={(e) => setForm((f) => ({ ...f, shippingFee: e.target.value }))}
                placeholder="30"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">Coût réel (DH, interne)</span>
              <input
                type="number" min={0} step="0.01"
                value={form.realShippingCost}
                onChange={(e) => setForm((f) => ({ ...f, realShippingCost: e.target.value }))}
                placeholder="20"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="size-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={submitForm}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une ville…"
          className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <MapPin className="mx-auto mb-2 text-gray-300" size={28} />
          <p className="text-sm text-gray-500">
            {rows.length === 0
              ? "Aucune ville. Ajoutez-en ou importez votre liste — en attendant, le checkout utilise le prix de livraison par défaut des Réglages."
              : "Aucune ville ne correspond à la recherche."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3 text-right">Prix client</th>
                <th className="px-4 py-3 text-right">Coût réel</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900">{c.shippingFee.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-500">{c.realShippingCost.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(c)} disabled={busy} className="text-gray-600 hover:text-gray-900" aria-label="Toggle active">
                      {c.active ? <ToggleRight className="text-emerald-600" size={22} /> : <ToggleLeft size={22} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="rounded p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900" aria-label="Edit">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setToDelete(c)} className="rounded p-1.5 text-gray-500 transition hover:bg-rose-50 hover:text-rose-600" aria-label="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtered.length)} sur {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
            >
              Précédent
            </button>
            <span className="px-2 tabular-nums">{pageSafe} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer la ville"
        message={toDelete ? `Supprimer « ${toDelete.name} » ? Le checkout utilisera à nouveau le prix par défaut pour cette ville.` : ""}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function num(s: string): number {
  const n = parseFloat((s || "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function apiError(e: unknown): string | null {
  const err = e as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message ?? null;
}

/**
 * Parse the bulk textarea: either a JSON array of {name, shippingFee, realShippingCost}
 * or one city per line as "Name, customerFee, realCost".
 */
function parseBulk(text: string): CityInput[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed) as Array<Record<string, unknown>>;
      return arr
        .map((o) => ({
          name: String(o.name ?? o.ville ?? o.city ?? "").trim(),
          shippingFee: toNum(o.shippingFee ?? o.customerFee ?? o.prix ?? o.fee),
          realShippingCost: toNum(o.realShippingCost ?? o.realCost ?? o.cost ?? o.cout),
          active: o.active === undefined ? true : Boolean(o.active),
        }))
        .filter((c) => c.name.length > 0);
    } catch {
      return [];
    }
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      return {
        name: parts[0] ?? "",
        shippingFee: toNum(parts[1]),
        realShippingCost: toNum(parts[2]),
        active: true,
      };
    })
    .filter((c) => c.name.length > 0);
}

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}
