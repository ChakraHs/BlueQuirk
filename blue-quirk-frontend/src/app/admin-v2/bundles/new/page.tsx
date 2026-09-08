"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import BundleForm from "@/components/admin/BundleForm";
import { BundleService, type BundleRequest } from "@/services/bundle.service";

export default function NewBundlePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (payload: BundleRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await BundleService.create(payload);
      sessionStorage.setItem("success", "Bundle offer created.");
      router.push("/admin-v2/bundles");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to create bundle offer.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link href="/admin-v2/bundles" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={14} /> Back to bundles
      </Link>
      <PageHeader title="New bundle" subtitle="Configure a build-your-set / quantity offer." />
      <BundleForm submitting={submitting} error={error} onSubmit={handleSubmit} />
    </div>
  );
}
