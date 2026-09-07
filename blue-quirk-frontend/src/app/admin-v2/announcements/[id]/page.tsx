"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import AnnouncementForm from "@/components/admin/AnnouncementForm";
import { TableSkeleton } from "@/components/admin/ui/Skeleton";
import { AnnouncementService, type Announcement, type AnnouncementRequest } from "@/services/announcement.service";

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const announcementId = Number(id);
  const router = useRouter();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AnnouncementService.get(announcementId)
      .then(setAnnouncement)
      .catch(() => setLoadError("Announcement not found."))
      .finally(() => setLoading(false));
  }, [announcementId]);

  const handleSubmit = async (payload: AnnouncementRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      await AnnouncementService.update(announcementId, payload);
      sessionStorage.setItem("success", "Announcement updated.");
      router.push("/admin-v2/announcements");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to update announcement.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link href="/admin-v2/announcements" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={14} /> Back to announcements
      </Link>

      {loading ? (
        <TableSkeleton />
      ) : loadError || !announcement ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
          {loadError || "Announcement not found."}
        </div>
      ) : (
        <>
          <PageHeader title="Edit announcement" subtitle={announcement.messageFr} />
          <AnnouncementForm initial={announcement} submitting={submitting} error={error} onSubmit={handleSubmit} />
          <div className="mt-6 max-w-3xl rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
            Last updated by <b className="text-gray-700">{announcement.updatedByEmail ?? "—"}</b> on {fmtDateTime(announcement.updatedAt)}
          </div>
        </>
      )}
    </div>
  );
}
