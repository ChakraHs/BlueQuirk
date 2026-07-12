"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, KeyRound, ImageUp, Mail, AtSign } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import {
  IntegrationsService,
  type IntegrationSettings,
} from "@/services/integrations.service";

export default function IntegrationsSettingsPage() {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields. Secrets are write-only: blank = leave unchanged.
  const [r2ApiToken, setR2ApiToken] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFrom, setResendFrom] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const s = await IntegrationsService.getSettings();
      setSettings(s);
      setResendFrom(s.resendFrom ?? "");
    } catch {
      setError("Failed to load integration settings.");
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
      const s = await IntegrationsService.updateSettings({
        // Only send secrets when the admin typed a new value.
        r2ApiToken: r2ApiToken.trim() ? r2ApiToken.trim() : undefined,
        resendApiKey: resendApiKey.trim() ? resendApiKey.trim() : undefined,
        // From-address is not secret: always send it (empty clears → env default).
        resendFrom: resendFrom.trim(),
      });
      setSettings(s);
      setR2ApiToken("");
      setResendApiKey("");
      setResendFrom(s.resendFrom ?? "");
      setSuccess("Integration settings saved.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to save integration settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Integrations & API keys"
        subtitle="Manage the Cloudflare R2 (image storage) and Resend (email) credentials. Configured here — no redeploy needed."
      />

      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="max-w-2xl space-y-6">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          {success && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={save} className="space-y-6">
            {/* Cloudflare R2 */}
            <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <ImageUp size={18} className="mt-0.5 shrink-0 text-gray-500" />
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Cloudflare R2 — image storage</h2>
                  <p className="text-xs text-gray-400">Used for all product & logo image uploads.</p>
                </div>
              </div>

              <StatusPill
                ok={!!settings?.r2ApiTokenSet}
                okText="Image storage is connected"
                badText="No R2 token — image uploads will fail"
                source={settings?.r2Source}
              />

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <KeyRound size={14} /> R2 API token
                </label>
                <input
                  type="password"
                  value={r2ApiToken}
                  onChange={(e) => setR2ApiToken(e.target.value)}
                  autoComplete="off"
                  placeholder={
                    settings?.r2ApiTokenSet
                      ? `Set (${settings.r2ApiTokenMasked}) — leave blank to keep`
                      : "Paste your Cloudflare R2 API token"
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Cloudflare dashboard → R2 → Manage API Tokens (Object Read &amp; Write).
                </p>
              </div>
            </section>

            {/* Resend */}
            <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Mail size={18} className="mt-0.5 shrink-0 text-gray-500" />
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Resend — transactional email</h2>
                  <p className="text-xs text-gray-400">Order confirmations, email verification, password resets.</p>
                </div>
              </div>

              <StatusPill
                ok={!!settings?.resendApiKeySet}
                okText="Email is connected"
                badText="No Resend key — emails will fail"
                source={settings?.resendSource}
              />

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <KeyRound size={14} /> Resend API key
                </label>
                <input
                  type="password"
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  autoComplete="off"
                  placeholder={
                    settings?.resendApiKeySet
                      ? `Set (${settings.resendApiKeyMasked}) — leave blank to keep`
                      : "Paste your Resend API key (re_…)"
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">Resend dashboard → API Keys.</p>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <AtSign size={14} /> From address
                </label>
                <input
                  value={resendFrom}
                  onChange={(e) => setResendFrom(e.target.value)}
                  placeholder="BlueQuirk <orders@contact.redquirk.com>"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  The domain must be verified in Resend. Leave blank to use the environment default.
                </p>
              </div>
            </section>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Save settings
              </button>
              {settings?.updatedByEmail && (
                <span className="text-xs text-gray-400">Last updated by {settings.updatedByEmail}</span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatusPill({
  ok,
  okText,
  badText,
  source,
}: {
  ok: boolean;
  okText: string;
  badText: string;
  source?: "db" | "env";
}) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${
        ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
      ) : (
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
      )}
      <p className={ok ? "text-emerald-700" : "text-amber-700"}>
        {ok ? okText : badText}{" "}
        {source && (
          <span className="opacity-70">(source: {source === "db" ? "dashboard" : "environment"})</span>
        )}
      </p>
    </div>
  );
}
