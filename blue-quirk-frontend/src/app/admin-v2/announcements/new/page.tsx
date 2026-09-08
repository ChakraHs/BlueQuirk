"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import AnnouncementForm from "@/components/admin/AnnouncementForm";
import { AnnouncementService, type AnnouncementRequest } from "@/services/announcement.service";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (payload: AnnouncementRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await AnnouncementService.create(payload);
      sessionStorage.setItem("success", "Announcement created.");
      router.push("/admin-v2/announcements");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to create announcement.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link href="/admin-v2/announcements" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={14} /> Back to announcements
      </Link>
      <PageHeader title="New announcement" subtitle="Add a message to the storefront announcement bar." />
      <AnnouncementForm submitting={submitting} error={error} onSubmit={handleSubmit} />
    </div>
  );
}
