"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Ticket, Wallet, TrendingUp, Clock } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import PromotionForm from "@/components/admin/PromotionForm";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { formatPrice } from "@/lib/money";
import {
  PromotionService, type PromotionDetail, type PromotionRequest,
} from "@/services/promotion.service";

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const promotionId = Number(id);
  const router = useRouter();

  const [promotion, setPromotion] = useState<PromotionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    PromotionService.get(promotionId)
      .then(setPromotion)
      .catch(() => setLoadError("Promotion not found."))
      .finally(() => setLoading(false));
  }, [promotionId]);

  const handleSubmit = async (payload: PromotionRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await PromotionService.update(promotionId, payload);
      sessionStorage.setItem("success", "Promotion updated.");
      router.push("/admin-v2/promotions");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to update promotion.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link href="/admin-v2/promotions" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={14} /> Back to promotions
      </Link>

      {loading ? (
        <TableSkeleton />
      ) : loadError || !promotion ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
          {loadError || "Promotion not found."}
        </div>
      ) : (
        <>
          <PageHeader title={promotion.name} subtitle={`Coupon ${promotion.code}`} />

          {/* Performance snapshot (View Details) */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Metric icon={<Ticket size={16} />} label="Redemptions" value={String(promotion.usageCount)} sub={promotion.maxGlobalUsage == null ? "unlimited" : `of ${promotion.maxGlobalUsage}`} />
            <Metric icon={<Wallet size={16} />} label="Discount given" value={formatPrice(promotion.totalDiscountGiven)} />
            <Metric icon={<TrendingUp size={16} />} label="Revenue generated" value={formatPrice(promotion.totalRevenueGenerated)} />
            <Metric icon={<Clock size={16} />} label="Last used" value={promotion.lastUsedAt ? fmtDateTime(promotion.lastUsedAt) : "Never"} small />
          </div>

          <PromotionForm initial={promotion} submitting={submitting} error={error} onSubmit={handleSubmit} />

          {/* Audit trail */}
          <div className="mt-6 max-w-4xl rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
            <div className="grid gap-2 sm:grid-cols-2">
              <span>Created by <b className="text-gray-700">{promotion.createdByEmail ?? "—"}</b> on {fmtDateTime(promotion.createdAt)}</span>
              <span>Last updated by <b className="text-gray-700">{promotion.updatedByEmail ?? "—"}</b> on {fmtDateTime(promotion.updatedAt)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ icon, label, value, sub, small }: { icon: React.ReactNode; label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <span className="text-gray-400">{icon}</span> {label}
      </div>
      <p className={`font-bold text-gray-900 ${small ? "text-sm" : "text-xl"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
