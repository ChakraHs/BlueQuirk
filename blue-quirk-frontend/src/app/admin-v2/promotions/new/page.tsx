"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import PromotionForm from "@/components/admin/PromotionForm";
import { PromotionService, type PromotionRequest } from "@/services/promotion.service";

export default function NewPromotionPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (payload: PromotionRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await PromotionService.create(payload);
      sessionStorage.setItem("success", "Promotion created.");
      router.push("/admin-v2/promotions");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to create promotion.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link href="/admin-v2/promotions" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={14} /> Back to promotions
      </Link>
      <PageHeader title="New promotion" subtitle="Create a coupon or discount campaign." />
      <PromotionForm submitting={submitting} error={error} onSubmit={handleSubmit} />
    </div>
  );
}
