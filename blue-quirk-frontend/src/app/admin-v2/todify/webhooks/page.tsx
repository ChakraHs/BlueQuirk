"use client";

import { useEffect, useState } from "react";
import { Webhook, Plus, Trash2, RefreshCw, Copy } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { TodifyService } from "@/services/todify.service";
import { TODIFY_WEBHOOK_EVENTS, type TodifyWebhook } from "@/types/todify";

export default function TodifyWebhooksPage() {
  const [webhooks, setWebhooks] = useState<TodifyWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [event, setEvent] = useState<string>(TODIFY_WEBHOOK_EVENTS[4]);
  const [busy, setBusy] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await TodifyService.listWebhooks();
      setWebhooks(res.data ?? []);
      setError(null);
    } catch (e) {
      setError(messageOf(e, "Impossible de charger les webhooks."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function register() {
    if (!url.trim()) return;
    setBusy(true);
    setNewSecret(null);
    try {
      const res = await TodifyService.registerWebhook(url.trim(), event);
      if (res.data?.secret) setNewSecret(res.data.secret);
      setUrl("");
      await load();
    } catch (e) {
      setError(messageOf(e, "Échec de l'enregistrement du webhook."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      await TodifyService.deleteWebhook(id);
      await load();
    } catch (e) {
      setError(messageOf(e, "Échec de la suppression."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Webhooks Todify"
        subtitle="Recevez les événements Todify en temps réel (templates et statuts de commande)."
      />

      {/* Register form */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-gray-700">Enregistrer un webhook</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://votre-domaine.com/api/todify/webhook"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {TODIFY_WEBHOOK_EVENTS.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
          <button
            disabled={busy || !url.trim()}
            onClick={register}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={15} /> Ajouter
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          L&apos;URL doit être en HTTPS et publiquement accessible (localhost et IP
          privées sont rejetés par Todify).
        </p>
      </div>

      {newSecret && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">
            Secret du webhook — affiché une seule fois, copiez-le maintenant :
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1 font-mono text-xs">
              {newSecret}
            </code>
            <button
              onClick={() => navigator.clipboard?.writeText(newSecret)}
              className="inline-flex items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-xs hover:bg-amber-100"
            >
              <Copy size={13} /> Copier
            </button>
          </div>
          <p className="mt-2 text-xs">
            Ajoutez-le au backend via <code>TODIFY_WEBHOOK_SECRET</code> (dans{" "}
            <code>.env</code>) pour valider les signatures.
          </p>
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={15} /> Actualiser
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : webhooks.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Webhook className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-sm text-gray-500">Aucun webhook enregistré.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Événement</th>
                <th className="px-4 py-3 text-left">URL</th>
                <th className="px-4 py-3 text-center">Actif</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {webhooks.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{w.event}</td>
                  <td className="px-4 py-3 max-w-[360px] truncate text-gray-600">{w.url}</td>
                  <td className="px-4 py-3 text-center">
                    {w.is_active === false ? "—" : "✓"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={busy}
                      onClick={() => remove(w.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={13} /> Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function messageOf(e: unknown, fallback: string): string {
  const resp = (e as { response?: { data?: { message?: string } } })?.response;
  return resp?.data?.message || fallback;
}
