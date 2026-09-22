"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Check, Loader2, Pencil, Search, Star, Trash2, X } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import api from "@/services/api";

type DisplayNameMode = "ORIGINAL" | "FIRST_NAME" | "ANONYMIZED" | "CUSTOM";

type AdminReview = {
  id: number;
  productId: number;
  productName: string | null;
  orderId: number | null;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  sizePurchased: string | null;
  variantColor: string | null;
  verifiedPurchase: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  featured: boolean;
  photoUrl: string | null;
  photoThumbnailUrl: string | null;
  createdAt: string | null;
  // Preserved original submission + display-name moderation.
  originalAuthorName: string | null;
  originalBody: string | null;
  originalTitle: string | null;
  originalRating: number | null;
  displayNameMode: DisplayNameMode | null;
  customDisplayName: string | null;
};

const DISPLAY_MODES: { key: DisplayNameMode; label: string }[] = [
  { key: "ORIGINAL", label: "Original name" },
  { key: "FIRST_NAME", label: "First name only" },
  { key: "ANONYMIZED", label: "Anonymized" },
  { key: "CUSTOM", label: "Custom" },
];

/**
 * Client-side preview of the public display name for each mode. Mirrors the
 * backend {@code ReviewService.resolveDisplayName} so the admin sees exactly what
 * will be published before approving; the server remains authoritative.
 */
function previewDisplayName(
  original: string,
  mode: DisplayNameMode,
  custom: string
): string {
  const name = (original || "").trim() || "Client";
  switch (mode) {
    case "CUSTOM":
      return custom.trim() || "…";
    case "FIRST_NAME":
      return name.split(/\s+/)[0];
    case "ANONYMIZED": {
      const parts = name.split(/\s+/);
      if (parts.length < 2 || !parts[1]) return parts[0];
      return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
    }
    case "ORIGINAL":
    default:
      return name;
  }
}

type AdminPage = {
  reviews: AdminReview[];
  page: number;
  totalPages: number;
  totalElements: number;
  hasMore: boolean;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
};

const TABS = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
] as const;

const STATUS_STYLE: Record<AdminReview["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
};

export default function AdminReviewsPage() {
  const [data, setData] = useState<AdminPage | null>(null);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Inline moderation editor: which review is open + its working copy.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    rating: 5,
    title: "",
    body: "",
    mode: "ORIGINAL" as DisplayNameMode,
    custom: "",
  });

  const openEditor = (r: AdminReview) => {
    setEditingId(r.id);
    setForm({
      rating: r.rating,
      title: r.title ?? "",
      body: r.body,
      mode: r.displayNameMode ?? "ORIGINAL",
      custom: r.customDisplayName ?? r.authorName ?? "",
    });
  };
  const closeEditor = () => setEditingId(null);

  // Only send fields that can be moderated; the server preserves the original.
  const moderationPayload = () => ({
    rating: form.rating,
    title: form.title.trim() || null,
    body: form.body,
    displayNameMode: form.mode,
    customDisplayName: form.mode === "CUSTOM" ? form.custom.trim() : undefined,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AdminPage>("/reviews", {
        params: { status: status || undefined, search: query || undefined, page: 0, size: 50 },
      });
      setData(data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: number, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const reject = (id: number) => act(id, () => api.patch(`/reviews/${id}/reject`));
  const feature = (id: number, featured: boolean) =>
    act(id, () => api.patch(`/reviews/${id}/feature`, { featured }));
  const remove = (id: number) =>
    act(id, () => api.delete(`/reviews/${id}`));

  // Save moderation edits (rating/body/title + chosen display name) WITHOUT
  // changing the status.
  const saveEdit = (id: number) =>
    act(id, async () => {
      await api.put(`/reviews/${id}`, moderationPayload());
      closeEditor();
    });

  // Approve WITH the moderation edits applied — the "choose the displayed name
  // before approving" flow. The original submission is preserved server-side.
  const approveEdited = (id: number) =>
    act(id, async () => {
      await api.patch(`/reviews/${id}/approve`, moderationPayload());
      closeEditor();
    });

  return (
    <div>
      <PageHeader
        title="Reviews"
        subtitle="Moderate customer reviews. Only approved reviews ever appear on the storefront (and only when reviews are enabled in Settings)."
      />

      {/* Moderation counts */}
      {data && (
        <div className="mb-4 grid grid-cols-3 gap-3 sm:max-w-md">
          <Stat label="Pending" value={data.pendingCount} tone="text-amber-600" />
          <Stat label="Approved" value={data.approvedCount} tone="text-emerald-600" />
          <Stat label="Rejected" value={data.rejectedCount} tone="text-rose-600" />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                status === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search text or author…"
            className="w-64 rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </form>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          Loading…
        </div>
      ) : !data || data.reviews.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          No reviews yet.
        </div>
      ) : (
        <div className="space-y-3">
          {data.reviews.map((r) => (
            <article key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex gap-4">
                {r.photoThumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.photoThumbnailUrl}
                    alt=""
                    className="size-16 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <RatingStars value={r.rating} />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                      {r.status.toLowerCase()}
                    </span>
                    {r.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <BadgeCheck className="size-3.5" /> verified
                      </span>
                    )}
                    {r.featured && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        featured
                      </span>
                    )}
                  </div>
                  {r.title && <p className="text-sm font-semibold text-gray-900">{r.title}</p>}
                  <p className="whitespace-pre-line text-sm text-gray-700">{r.body}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {r.authorName}
                    {r.productName ? ` · ${r.productName}` : ` · product #${r.productId}`}
                    {r.createdAt ? ` · ${new Date(r.createdAt).toLocaleDateString()}` : ""}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {busyId === r.id ? (
                    <Loader2 className="size-4 animate-spin text-gray-400" />
                  ) : (
                    <>
                      <ActionBtn
                        onClick={() => (editingId === r.id ? closeEditor() : openEditor(r))}
                        tone="emerald"
                        icon={r.status !== "APPROVED" ? Check : Pencil}
                        label={r.status !== "APPROVED" ? "Review & approve" : "Moderate"}
                      />
                      {r.status !== "REJECTED" && (
                        <ActionBtn onClick={() => reject(r.id)} tone="amber" icon={X} label="Reject" />
                      )}
                      <ActionBtn
                        onClick={() => feature(r.id, !r.featured)}
                        tone="blue"
                        icon={Star}
                        label={r.featured ? "Unfeature" : "Feature"}
                      />
                      <ActionBtn onClick={() => remove(r.id)} tone="rose" icon={Trash2} label="Delete" />
                    </>
                  )}
                </div>
              </div>

              {editingId === r.id && (
                <div className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  {/* Preserved original submission — never overwritten. */}
                  <div className="rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-500">
                    <p className="mb-1 font-semibold uppercase tracking-wide text-gray-400">
                      Original submission (preserved)
                    </p>
                    <p>
                      <span className="text-gray-400">Name:</span>{" "}
                      {r.originalAuthorName ?? r.authorName} ·{" "}
                      <span className="text-gray-400">Rating:</span>{" "}
                      {r.originalRating ?? r.rating}/5
                    </p>
                    <p className="mt-1 whitespace-pre-line text-gray-600">
                      {r.originalBody ?? r.body}
                    </p>
                  </div>

                  {/* Rating + text moderation */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Rating</span>
                    <span className="inline-flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, rating: n }))}
                          aria-label={`${n} stars`}
                        >
                          <Star
                            className={`size-5 ${
                              n <= form.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                    </span>
                  </div>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Title (optional)"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    rows={3}
                    className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />

                  {/* Displayed name chooser */}
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-gray-500">Displayed name</p>
                    <div className="flex flex-wrap gap-2">
                      {DISPLAY_MODES.map((m) => {
                        const original = r.originalAuthorName ?? r.authorName ?? "";
                        const active = form.mode === m.key;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, mode: m.key }))}
                            className={`rounded-md border px-2.5 py-1.5 text-left text-xs transition ${
                              active
                                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <span className="block font-medium">{m.label}</span>
                            {m.key !== "CUSTOM" && (
                              <span className="block text-[11px] text-gray-400">
                                “{previewDisplayName(original, m.key, "")}”
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {form.mode === "CUSTOM" && (
                      <input
                        value={form.custom}
                        onChange={(e) => setForm((f) => ({ ...f, custom: e.target.value }))}
                        placeholder="Custom display name"
                        className="mt-2 w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                    <p className="mt-1.5 text-xs text-gray-500">
                      Will be shown as{" "}
                      <span className="font-semibold text-gray-800">
                        “{previewDisplayName(r.originalAuthorName ?? r.authorName ?? "", form.mode, form.custom)}”
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {r.status !== "APPROVED" && (
                      <button
                        type="button"
                        onClick={() => approveEdited(r.id)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                      >
                        <Check className="size-4" /> Approve &amp; publish
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => saveEdit(r.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={closeEditor}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
      <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function RatingStars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-4 ${n <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
        />
      ))}
    </span>
  );
}

function ActionBtn({
  onClick,
  tone,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  tone: "emerald" | "amber" | "blue" | "rose";
  icon: typeof Check;
  label: string;
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-700 hover:bg-emerald-50",
    amber: "text-amber-700 hover:bg-amber-50",
    blue: "text-blue-700 hover:bg-blue-50",
    rose: "text-rose-700 hover:bg-rose-50",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${tones[tone]}`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
