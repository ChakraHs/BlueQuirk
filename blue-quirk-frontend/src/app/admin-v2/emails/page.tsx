"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mail, Loader2, Check, Plus, Code2 } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import {
  EmailTemplateService,
  type EmailCatalog,
  type EmailEventInfo,
} from "@/services/emailTemplate.service";

// Client-side sample values for the live preview (mirrors the backend's
// EmailTemplateCatalog.sampleVariables). Preview only — real emails are rendered
// server-side with actual order data.
const SAMPLE: Record<string, string> = {
  storeName: "BlueQuirk",
  orderRef: "BQ-2026-000042",
  customerName: "Sara Bennani",
  customerEmail: "sara@example.com",
  phone: "+212 6 12 34 56 78",
  address: "12 Rue des Oudayas",
  city: "Rabat",
  subtotal: "260.00 DH",
  shipping: "29.00 DH",
  total: "289.00 DH",
  trackingNumber: "MA123456789",
  trackingLine: "Tracking number: <strong>MA123456789</strong>.",
  cancellationReason: "Out of stock",
  cancellationLine: "Reason: <strong>Out of stock</strong>.",
  estimatedDelivery: "2026-07-10",
  trackUrl: "#",
  trackButton:
    "<div style='margin:18px 0'><a href='#' style='display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px'>Track my order</a></div>",
  itemsTable:
    "<table style='width:100%;border-collapse:collapse;font-size:14px'><tbody><tr><td style='padding:10px 8px;border-bottom:1px solid #eee'><strong>Regular Premium Unisex T-Shirt</strong><div style='color:#6b7280;font-size:12px'>Black / M</div></td><td style='padding:10px 8px;border-bottom:1px solid #eee;text-align:center'>2</td><td style='padding:10px 8px;border-bottom:1px solid #eee;text-align:right'>260.00 DH</td></tr></tbody></table>",
  orderSummary:
    "<table style='width:100%;font-size:14px;margin-top:12px'><tr><td>Subtotal</td><td style='text-align:right'>260.00 DH</td></tr><tr><td>Shipping</td><td style='text-align:right'>29.00 DH</td></tr><tr><td style='font-weight:700'>Total (cash on delivery)</td><td style='text-align:right;font-weight:700'>289.00 DH</td></tr></table>",
  shippingBlock:
    "<div style='background:#f9fafb;border-radius:10px;padding:16px;margin-top:16px'><p style='margin:0 0 6px;font-weight:600'>Delivery</p><p style='margin:2px 0;color:#374151'>Sara Bennani — +212 6 12 34 56 78</p><p style='margin:2px 0;color:#374151'>12 Rue des Oudayas, Rabat</p></div>",
};

function render(text: string): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    key in SAMPLE ? SAMPLE[key] : `<span style="background:#fef3c7;color:#92400e;padding:0 3px;border-radius:3px">{{${key}}}</span>`
  );
}

export default function EmailTemplatesPage() {
  const [catalog, setCatalog] = useState<EmailCatalog | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [active, setActive] = useState(true);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const loadCatalog = useCallback(async () => {
    try {
      const c = await EmailTemplateService.catalog();
      setCatalog(c);
      setSelected((prev) => prev ?? c.events[0]?.code ?? null);
    } catch {
      setError("Failed to load email templates. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const selectEvent = useCallback(async (ev: EmailEventInfo) => {
    setSelected(ev.code);
    setSaved(false);
    setError(null);
    if (ev.assigned) {
      setLoadingTemplate(true);
      try {
        const t = await EmailTemplateService.getByCode(ev.code);
        setTemplateId(t.id);
        setSubject(t.subject);
        setBody(t.body);
        setActive(t.active);
      } catch {
        setError("Failed to load this template.");
      } finally {
        setLoadingTemplate(false);
      }
    } else {
      setTemplateId(null);
      setSubject("");
      setBody("");
      setActive(true);
    }
  }, []);

  // Load the first event's template once the catalog arrives.
  useEffect(() => {
    if (catalog && selected) {
      const ev = catalog.events.find((e) => e.code === selected);
      if (ev && templateId === null && subject === "" && body === "") {
        selectEvent(ev);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  const insertVariable = (name: string) => {
    const el = bodyRef.current;
    const token = `{{${name}}}`;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const save = async () => {
    if (!selected) return;
    if (!subject.trim() || !body.trim()) {
      setError("Subject and body are required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = { code: selected, subject, body, active };
      const t = templateId
        ? await EmailTemplateService.update(templateId, payload)
        : await EmailTemplateService.create(payload);
      setTemplateId(t.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await loadCatalog();
    } catch {
      setError("Failed to save the template.");
    } finally {
      setSaving(false);
    }
  };

  const previewHtml = useMemo(() => render(body), [body]);
  const previewSubject = useMemo(() => render(subject).replace(/<[^>]+>/g, ""), [subject]);
  const currentEvent = catalog?.events.find((e) => e.code === selected);

  return (
    <div>
      <PageHeader
        title="Email templates"
        subtitle="Edit the transactional emails your store sends. Each event uses its assigned template, with {{variables}} filled from the order."
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading || !catalog ? (
        <div className="flex h-64 items-center justify-center text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Event list */}
          <div className="h-fit rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Emails
            </div>
            <ul>
              {catalog.events.map((ev) => {
                const isSel = ev.code === selected;
                return (
                  <li key={ev.code}>
                    <button
                      onClick={() => selectEvent(ev)}
                      className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition ${
                        isSel ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <Mail
                        size={16}
                        className={`mt-0.5 shrink-0 ${isSel ? "text-blue-600" : "text-gray-400"}`}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-800">
                          {ev.label}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          {ev.assigned ? (
                            ev.active ? (
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Active
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                                Inactive
                              </span>
                            )
                          ) : (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              Not set
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Editor + preview */}
          <div className="min-w-0 space-y-4">
            {currentEvent && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-800">{currentEvent.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{currentEvent.description}</p>
              </div>
            )}

            {loadingTemplate ? (
              <div className="flex h-40 items-center justify-center text-gray-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {/* Editor */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Your order {{orderRef}} is confirmed"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="mb-1 mt-4 flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">Body (HTML)</label>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Code2 size={13} /> HTML + {"{{variables}}"}
                      </span>
                    </div>
                    <textarea
                      ref={bodyRef}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={16}
                      spellCheck={false}
                      placeholder="<h2>Order confirmed</h2><p>Hi {{customerName}}…</p>{{itemsTable}}"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs leading-relaxed text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />

                    <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Active — send this template for the event (uncheck to fall back to the built-in email)
                    </label>

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={save}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                      >
                        {saving ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : templateId ? null : (
                          <Plus size={15} />
                        )}
                        {templateId ? "Save changes" : "Create template"}
                      </button>
                      {saved && (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                          <Check size={15} /> Saved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Variables */}
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="mb-2 text-sm font-medium text-gray-700">Variables</p>
                    <p className="mb-3 text-xs text-gray-400">
                      Click to insert into the body. They&apos;re replaced with real order data when the
                      email is sent.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {catalog.variables.map((v) => (
                        <button
                          key={v.name}
                          onClick={() => insertVariable(v.name)}
                          title={v.description}
                          className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {`{{${v.name}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live preview */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-medium text-gray-700">Preview</p>
                  <div className="mb-2 rounded-md bg-gray-50 px-3 py-2 text-sm">
                    <span className="text-xs text-gray-400">Subject: </span>
                    <span className="font-medium text-gray-800">{previewSubject || "—"}</span>
                  </div>
                  <iframe
                    title="Email preview"
                    className="h-[520px] w-full rounded-md border border-gray-200 bg-white"
                    srcDoc={previewHtml}
                  />
                  <p className="mt-2 text-xs text-gray-400">
                    Rendered with sample data. Real emails use the actual order.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
