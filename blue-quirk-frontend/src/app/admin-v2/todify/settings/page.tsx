"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, KeyRound, Link2, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { TodifyService, type TodifySettings } from "@/services/todify.service";

export default function TodifySettingsPage() {
  const [settings, setSettings] = useState<TodifySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields. Secrets are write-only: blank = leave unchanged.
  const [enabled, setEnabled] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const s = await TodifyService.getSettings();
      setSettings(s);
      setEnabled(s.enabled);
      setBaseUrl(s.baseUrl);
    } catch {
      setError("Failed to load Todify settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const s = await TodifyService.updateSettings({
        enabled,
        baseUrl: baseUrl.trim() || undefined,
        // Only send secrets when the admin typed a new value.
        apiToken: apiToken.trim() ? apiToken.trim() : undefined,
        webhookSecret: webhookSecret.trim() ? webhookSecret.trim() : undefined,
      });
      setSettings(s);
      setApiToken("");
      setWebhookSecret("");
      setSuccess("Todify settings saved.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to save Todify settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Todify settings"
        subtitle="Connect the Todify print-on-demand integration. Configured here — no redeploy needed."
      />

      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* Connection status */}
          {settings && (
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                settings.configured
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              {settings.configured ? (
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
              ) : (
                <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
              )}
              <div className="text-sm">
                <p className={`font-semibold ${settings.configured ? "text-emerald-800" : "text-amber-800"}`}>
                  {settings.configured ? "Todify is connected" : "Todify is not configured"}
                </p>
                <p className={settings.configured ? "text-emerald-700" : "text-amber-700"}>
                  {settings.configured
                    ? "Orders with linked templates will sync automatically."
                    : "Enter an API token below to enable order syncing."}{" "}
                  <span className="opacity-70">
                    (config source: {settings.source === "db" ? "dashboard" : "environment"})
                  </span>
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          {success && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={save} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            {/* Enabled */}
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-gray-200 px-3 py-2.5">
              <span>
                <span className="block text-sm font-medium text-gray-800">Enabled</span>
                <span className="block text-xs text-gray-400">Turn the whole Todify integration on or off.</span>
              </span>
              <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${enabled ? "bg-emerald-500" : "bg-gray-300"}`}>
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="sr-only" />
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </span>
            </label>

            {/* API token */}
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <KeyRound size={14} /> API token
              </label>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                autoComplete="off"
                placeholder={settings?.apiTokenSet ? `Set (${settings.apiTokenMasked}) — leave blank to keep` : "Paste your Todify API token"}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">Todify dashboard → Developer/API → API token.</p>
            </div>

            {/* Base URL */}
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Link2 size={14} /> API base URL
              </label>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://todify.ma/api/v1"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Webhook secret */}
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <ShieldCheck size={14} /> Webhook secret
              </label>
              <input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                autoComplete="off"
                placeholder={settings?.webhookSecretSet ? "Set — leave blank to keep" : "Used to verify inbound webhooks (optional)"}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Must match the secret configured on the Todify webhook so signatures verify.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Save settings
              </button>
              {settings?.updatedByEmail && (
                <span className="text-xs text-gray-400">
                  Last updated by {settings.updatedByEmail}
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
