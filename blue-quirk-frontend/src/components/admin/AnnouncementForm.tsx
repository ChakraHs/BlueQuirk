"use client";

import { useMemo, useState } from "react";
import { Loader2, Save, AlertCircle, ArrowRight, Monitor, Smartphone, X } from "lucide-react";
import {
  type Announcement,
  type AnnouncementRequest,
  type AnnouncementType,
} from "@/services/announcement.service";

const TYPE_LABELS: Record<AnnouncementType, string> = {
  INFO: "Info",
  PROMOTION: "Promotion",
  SHIPPING: "Shipping",
  NEW_COLLECTION: "New collection",
  IMPORTANT: "Important",
};

// Sample values so the admin preview looks realistic for dynamic placeholders. The
// real values are resolved on the storefront from the centralized discount quote.
const SAMPLE_PLACEHOLDERS: Record<string, string> = {
  discount: "40",
  next_discount: "20",
  items_remaining: "1",
  cart_items: "3",
  cart_total: "697",
};

function fillSample(message: string): string {
  return message.replace(/\{([a-z_]+)\}/gi, (tok, key) => SAMPLE_PLACEHOLDERS[key.toLowerCase()] ?? tok);
}

export default function AnnouncementForm({
  initial,
  submitting,
  error,
  onSubmit,
}: {
  initial?: Announcement;
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: AnnouncementRequest) => void;
}) {
  const [messageFr, setMessageFr] = useState(initial?.messageFr ?? "");
  const [messageEn, setMessageEn] = useState(initial?.messageEn ?? "");
  const [messageAr, setMessageAr] = useState(initial?.messageAr ?? "");
  const [type, setType] = useState<AnnouncementType>(initial?.type ?? "INFO");
  const [active, setActive] = useState(initial?.active ?? true);
  const [startAt, setStartAt] = useState(initial?.startAt ? initial.startAt.slice(0, 16) : "");
  const [endAt, setEndAt] = useState(initial?.endAt ? initial.endAt.slice(0, 16) : "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [linkTextFr, setLinkTextFr] = useState(initial?.linkTextFr ?? "");
  const [linkTextEn, setLinkTextEn] = useState(initial?.linkTextEn ?? "");
  const [linkTextAr, setLinkTextAr] = useState(initial?.linkTextAr ?? "");
  const [openInNewTab, setOpenInNewTab] = useState(initial?.openInNewTab ?? false);
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [bgColor, setBgColor] = useState(initial?.bgColor ?? "");
  const [textColor, setTextColor] = useState(initial?.textColor ?? "");
  const [displayDuration, setDisplayDuration] = useState<number | "">(initial?.displayDuration ?? "");
  const [dismissible, setDismissible] = useState(initial?.dismissible ?? true);

  const [localError, setLocalError] = useState<string | null>(null);

  const previewMessage = useMemo(() => fillSample(messageFr || "Your announcement message"), [messageFr]);
  const previewLinkText = linkTextFr || (link ? "Shop now" : "");

  const validate = (): string | null => {
    if (!messageFr.trim()) return "The French message is required.";
    if (messageFr.length > 300) return "The message is too long (max 300 characters).";
    if (link.trim()) {
      const l = link.trim();
      const ok = l.startsWith("/") || l.startsWith("http://") || l.startsWith("https://");
      if (!ok) return "Link must be a relative path (starting with /) or an http(s) URL.";
    }
    if (startAt && endAt && startAt > endAt) return "The end date must be on or after the start date.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setLocalError(err); return; }
    setLocalError(null);
    onSubmit({
      messageFr: messageFr.trim(),
      messageEn: messageEn.trim() || null,
      messageAr: messageAr.trim() || null,
      type,
      active,
      startAt: startAt || null,
      endAt: endAt || null,
      link: link.trim() || null,
      linkTextFr: linkTextFr.trim() || null,
      linkTextEn: linkTextEn.trim() || null,
      linkTextAr: linkTextAr.trim() || null,
      openInNewTab,
      icon: icon.trim() || null,
      bgColor: bgColor.trim() || null,
      textColor: textColor.trim() || null,
      displayDuration: displayDuration === "" ? null : Number(displayDuration),
      dismissible,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {(localError || error) && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{localError || error}</span>
        </div>
      )}

      {/* Live preview (desktop + mobile) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Preview</h3>
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500"><Monitor size={13} /> Desktop</p>
            <BarPreview icon={icon} message={previewMessage} linkText={previewLinkText} bgColor={bgColor} textColor={textColor} dismissible={dismissible} />
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500"><Smartphone size={13} /> Mobile</p>
            <div className="mx-auto max-w-[380px]">
              <BarPreview icon={icon} message={previewMessage} linkText={previewLinkText} bgColor={bgColor} textColor={textColor} dismissible={dismissible} />
            </div>
          </div>
          {/\{[a-z_]+\}/i.test(messageFr) && (
            <p className="text-xs text-gray-400">
              Dynamic values (e.g. <code>{"{next_discount}"}</code>) are shown here with sample numbers; on the storefront they resolve from the live discount state.
            </p>
          )}
        </div>
      </div>

      <Section title="Message">
        <Field label="French (required)" required>
          <input value={messageFr} onChange={(e) => setMessageFr(e.target.value)} maxLength={300}
            placeholder="🚚 Livraison gratuite partout au Maroc" className={inputCls} />
        </Field>
        <Field label="English">
          <input value={messageEn} onChange={(e) => setMessageEn(e.target.value)} maxLength={300}
            placeholder="🚚 Free shipping across Morocco" className={inputCls} />
        </Field>
        <Field label="Arabic" hint="Right-to-left is handled automatically on the storefront.">
          <input value={messageAr} onChange={(e) => setMessageAr(e.target.value)} maxLength={300} dir="rtl"
            placeholder="🚚 شحن مجاني في كل المغرب" className={inputCls} />
        </Field>
        <p className="text-xs text-gray-400">
          Supports placeholders: <code>{"{next_discount}"}</code>, <code>{"{items_remaining}"}</code>, <code>{"{discount}"}</code>, <code>{"{cart_items}"}</code>, <code>{"{cart_total}"}</code>. Add the currency label yourself, e.g. “save {"{next_discount}"} DH”.
        </p>
      </Section>

      <Section title="Type & status">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value as AnnouncementType)} className={inputCls}>
              {(Object.keys(TYPE_LABELS) as AnnouncementType[]).map((tk) => (
                <option key={tk} value={tk}>{TYPE_LABELS[tk]}</option>
              ))}
            </select>
          </Field>
          <Field label="Display duration (seconds)" hint="Blank = default rotation (5s).">
            <input type="number" min={1} step={1} value={displayDuration}
              onChange={(e) => setDisplayDuration(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="5" className={inputCls} />
          </Field>
        </div>
        <Toggle label="Active" hint="Inactive announcements never display." value={active} onChange={setActive} />
        <Toggle label="Show close button" hint="Let customers dismiss this announcement." value={dismissible} onChange={setDismissible} />
      </Section>

      <Section title="Schedule">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start" hint="Blank = active immediately.">
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputCls} />
          </Field>
          <Field label="End" hint="Blank = no end date.">
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </Section>

      <Section title="Call to action (optional)">
        <Field label="Link" hint="Relative path (/fr/search?q=) or full https:// URL.">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/fr/search" className={inputCls} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Link text (FR)"><input value={linkTextFr} onChange={(e) => setLinkTextFr(e.target.value)} maxLength={80} placeholder="Découvrir" className={inputCls} /></Field>
          <Field label="Link text (EN)"><input value={linkTextEn} onChange={(e) => setLinkTextEn(e.target.value)} maxLength={80} placeholder="Shop now" className={inputCls} /></Field>
          <Field label="Link text (AR)"><input value={linkTextAr} onChange={(e) => setLinkTextAr(e.target.value)} maxLength={80} dir="rtl" placeholder="تسوّق الآن" className={inputCls} /></Field>
        </div>
        <Toggle label="Open link in a new tab" value={openInNewTab} onChange={setOpenInNewTab} />
      </Section>

      <Section title="Appearance (optional)">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Icon / emoji" hint="Shown before the text.">
            <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={16} placeholder="🚚" className={inputCls} />
          </Field>
          <Field label="Background color" hint="Blank = theme default (dark).">
            <input value={bgColor} onChange={(e) => setBgColor(e.target.value)} placeholder="#111827" className={inputCls} />
          </Field>
          <Field label="Text color" hint="Blank = white.">
            <input value={textColor} onChange={(e) => setTextColor(e.target.value)} placeholder="#ffffff" className={inputCls} />
          </Field>
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {submitting ? "Saving…" : "Save announcement"}
        </button>
      </div>
    </form>
  );
}

/** A faithful mini-render of the storefront bar for the admin preview. */
function BarPreview({ icon, message, linkText, bgColor, textColor, dismissible }: {
  icon: string; message: string; linkText: string; bgColor: string; textColor: string; dismissible: boolean;
}) {
  const style: React.CSSProperties = {
    backgroundColor: bgColor || "#111827",
    color: textColor || "#ffffff",
  };
  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={style}>
      <div className="flex min-h-[36px] items-center justify-center gap-x-2 px-9 py-1.5 text-center text-[12px] leading-snug sm:text-[13px]">
        {icon && <span className="text-sm">{icon}</span>}
        <span className="font-medium">{message}</span>
        {linkText && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold underline decoration-white/40 underline-offset-2">
            {linkText}<ArrowRight size={13} />
          </span>
        )}
      </div>
      {dismissible && (
        <span className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/70">
          <X size={15} />
        </span>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Toggle({ label, hint, value, onChange }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className={`inline-flex h-8 w-20 shrink-0 items-center justify-center rounded-full px-3 text-xs font-semibold transition ${
          value ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
        }`}>
        {value ? "On" : "Off"}
      </button>
    </div>
  );
}
