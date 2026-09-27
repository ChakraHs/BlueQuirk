"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import CareGuideForm from "@/components/admin/CareGuideForm";
import { CareGuideService, type CareGuideTemplateRequest } from "@/services/careGuide.service";

export default function NewCareGuidePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (payload: CareGuideTemplateRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await CareGuideService.create(payload);
      sessionStorage.setItem("success", "Care guide created.");
      router.push("/admin-v2/care-guides");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to create the care guide.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link
        href="/admin-v2/care-guides"
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={14} /> Back to care guides
      </Link>
      <PageHeader title="New care guide" subtitle="Create a reusable Care & Wear guide you can attach to products." />
      <CareGuideForm submitting={submitting} error={error} onSubmit={handleSubmit} />
    </div>
  );
}
