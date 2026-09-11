"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Check, Loader2, Search, Star, Trash2, X } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import api from "@/services/api";

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
};

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

  const approve = (id: number) => act(id, () => api.patch(`/reviews/${id}/approve`));
  const reject = (id: number) => act(id, () => api.patch(`/reviews/${id}/reject`));
  const feature = (id: number, featured: boolean) =>
    act(id, () => api.patch(`/reviews/${id}/feature`, { featured }));
  const remove = (id: number) =>
    act(id, () => api.delete(`/reviews/${id}`));

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
                      {r.status !== "APPROVED" && (
                        <ActionBtn onClick={() => approve(r.id)} tone="emerald" icon={Check} label="Approve" />
                      )}
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
