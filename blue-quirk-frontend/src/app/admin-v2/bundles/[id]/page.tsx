"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Boxes, Wallet } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import BundleForm from "@/components/admin/BundleForm";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { formatPrice } from "@/lib/money";
import { BundleService, type BundleOffer, type BundleRequest } from "@/services/bundle.service";

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function EditBundlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const bundleId = Number(id);
  const router = useRouter();

  const [bundle, setBundle] = useState<BundleOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    BundleService.get(bundleId)
      .then(setBundle)
      .catch(() => setLoadError("Bundle offer not found."))
      .finally(() => setLoading(false));
  }, [bundleId]);

  const handleSubmit = async (payload: BundleRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await BundleService.update(bundleId, payload);
      sessionStorage.setItem("success", "Bundle offer updated.");
      router.push("/admin-v2/bundles");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to update bundle offer.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link href="/admin-v2/bundles" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={14} /> Back to bundles
      </Link>

      {loading ? (
        <TableSkeleton />
      ) : loadError || !bundle ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
          {loadError || "Bundle offer not found."}
        </div>
      ) : (
        <>
          <PageHeader title={bundle.name} subtitle={bundle.pricingLabel} />

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Metric icon={<Boxes size={16} />} label="Times applied" value={String(bundle.usageCount)} />
            <Metric icon={<Wallet size={16} />} label="Discount given" value={formatPrice(bundle.totalDiscountGiven)} />
            <Metric label="Status" value={bundle.active ? "On" : "Off"} />
          </div>

          <BundleForm initial={bundle} submitting={submitting} error={error} onSubmit={handleSubmit} />

          <div className="mt-6 max-w-3xl rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
            <div className="grid gap-2 sm:grid-cols-2">
              <span>Created by <b className="text-gray-700">{bundle.createdByEmail ?? "—"}</b> on {fmtDateTime(bundle.createdAt)}</span>
              <span>Last updated by <b className="text-gray-700">{bundle.updatedByEmail ?? "—"}</b> on {fmtDateTime(bundle.updatedAt)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {icon && <span className="text-gray-400">{icon}</span>} {label}
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
