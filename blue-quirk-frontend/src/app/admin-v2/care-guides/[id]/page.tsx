"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import CareGuideForm from "@/components/admin/CareGuideForm";
import {
  CareGuideService,
  type CareGuideTemplate,
  type CareGuideTemplateRequest,
} from "@/services/careGuide.service";

export default function EditCareGuidePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [template, setTemplate] = useState<CareGuideTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setTemplate(await CareGuideService.get(id));
      } catch {
        setError("Care guide not found.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (payload: CareGuideTemplateRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await CareGuideService.update(id, payload);
      sessionStorage.setItem("success", "Care guide updated.");
      router.push("/admin-v2/care-guides");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to update the care guide.");
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
      <PageHeader
        title="Edit care guide"
        subtitle={
          template
            ? `${template.name}${template.inUseCount > 0 ? ` · used by ${template.inUseCount} product(s)` : ""}`
            : undefined
        }
      />
      {loading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : error && !template ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      ) : (
        <CareGuideForm initial={template} submitting={submitting} error={error} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
