"use client";

import { useRef, useState, useCallback } from "react";
import {
  UploadCloud,
  Loader2,
  Trash2,
  AlertCircle,
  Film,
  ImageIcon,
  RefreshCw,
  CheckCircle2,
  Clock,
  HardDrive,
} from "lucide-react";
import { VideoService } from "@/services/video.service";
import { ImageService } from "@/services/image.service";
import type { ProductVideo } from "@/types/product";
import { readVideoMeta, capturePosterBlob } from "@/lib/videoPoster";

const MAX_MB = 120;

/** Human-readable byte size. */
function formatSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Phase =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "poster" }
  | { kind: "uploading"; percent: number }
  | { kind: "poster-upload" };

/**
 * Admin featured-video manager — a professional, drag-and-drop uploader that
 * mirrors the product image manager. Accepts a single MP4 (H.264) per product,
 * auto-captures a poster frame + reads the clip duration/resolution client-side,
 * uploads the MP4 to Cloudflare R2 with a real progress bar, then the poster
 * through the optimized image pipeline. Supports preview, replace, remove, and a
 * custom poster. Controlled — the parent owns the value.
 */
export default function ProductVideoManager({
  value,
  onChange,
}: {
  value: ProductVideo | null;
  onChange: (video: ProductVideo | null) => void;
}) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string | null>(null);
  const busy = phase.kind !== "idle";

  const statusLabel = (() => {
    switch (phase.kind) {
      case "reading":
        return "Reading video…";
      case "poster":
        return "Generating poster…";
      case "uploading":
        return `Uploading… ${phase.percent}%`;
      case "poster-upload":
        return "Uploading poster…";
      default:
        return "";
    }
  })();

  const handleVideoFile = useCallback(
    async (file: File) => {
      setError(null);

      const isMp4 = file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
      if (!isMp4) {
        setError("Only MP4 (H.264) videos are supported.");
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`Video is too large (max ${MAX_MB} MB). Please compress it first.`);
        return;
      }

      try {
        // 1) Read duration + resolution from the local file (best-effort).
        setPhase({ kind: "reading" });
        let duration = 0;
        try {
          const meta = await readVideoMeta(file);
          duration = meta.duration;
          if (meta.width && meta.height) setResolution(`${meta.width}×${meta.height}`);
        } catch {
          /* metadata is optional */
        }

        // 2) Capture a poster frame from the local file, then upload it through
        //    the normal (optimized) image pipeline. Poster is best-effort.
        setPhase({ kind: "poster" });
        let posterImageUrl: string | undefined;
        try {
          const posterBlob = await capturePosterBlob(file);
          if (posterBlob) {
            const posterFile = new File([posterBlob], "video-poster.jpg", { type: "image/jpeg" });
            const uploaded = await ImageService.upload(posterFile);
            posterImageUrl = uploaded.displayUrl || uploaded.url;
          }
        } catch {
          /* poster is optional; continue without it */
        }

        // 3) Upload the MP4 itself to R2 with a real progress bar.
        setPhase({ kind: "uploading", percent: 0 });
        const uploadedVideo = await VideoService.upload(file, (percent) =>
          setPhase({ kind: "uploading", percent })
        );

        onChange({
          videoUrl: uploadedVideo.videoUrl,
          posterImageUrl: posterImageUrl ?? value?.posterImageUrl ?? null,
          duration: duration || null,
          fileSize: uploadedVideo.fileSize || file.size,
        });
      } catch {
        setError("Failed to upload the video. Please try again.");
      } finally {
        setPhase({ kind: "idle" });
      }
    },
    [onChange, value?.posterImageUrl]
  );

  const handlePosterFile = useCallback(
    async (file: File) => {
      if (!value) return;
      setError(null);
      try {
        setPhase({ kind: "poster-upload" });
        const uploaded = await ImageService.upload(file);
        onChange({ ...value, posterImageUrl: uploaded.displayUrl || uploaded.url });
      } catch {
        setError("Failed to upload the poster image.");
      } finally {
        setPhase({ kind: "idle" });
      }
    },
    [value, onChange]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const f = e.dataTransfer.files?.[0];
    if (f) handleVideoFile(f);
  };

  const remove = () => {
    setError(null);
    setResolution(null);
    onChange(null);
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Film size={15} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Featured video</h3>
            <p className="text-[11px] text-gray-400">
              Optional · shown as the second slide in the gallery
            </p>
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
          MP4 · H.264 · ≤ {MAX_MB} MB
        </span>
      </div>

      {/* Hidden inputs */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) handleVideoFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={posterInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) handlePosterFile(e.target.files[0]);
          e.target.value = "";
        }}
      />

      <div className="p-4">
        {busy ? (
          /* Working state — staged status + progress bar */
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Loader2 className="animate-spin text-violet-600" size={18} />
              {statusLabel}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-violet-600 transition-all duration-200"
                style={{
                  width:
                    phase.kind === "uploading"
                      ? `${phase.percent}%`
                      : phase.kind === "reading"
                      ? "20%"
                      : phase.kind === "poster"
                      ? "45%"
                      : "70%",
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              Keep this tab open until the upload completes.
            </p>
          </div>
        ) : !value ? (
          /* Empty state — drag & drop zone */
          <div
            onClick={() => videoInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition ${
              dragOver
                ? "border-violet-500 bg-violet-50"
                : "border-gray-300 bg-gray-50 hover:border-gray-400"
            }`}
          >
            <UploadCloud className="mb-2 text-gray-400" size={30} />
            <p className="text-sm font-medium text-gray-700">
              Drag & drop a video here, or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-400">
              A poster image is generated automatically from the first frame.
            </p>
          </div>
        ) : (
          /* Filled state — preview + metadata + actions */
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative w-full shrink-0 overflow-hidden rounded-lg bg-black sm:w-64">
              <video
                src={value.videoUrl}
                poster={value.posterImageUrl ?? undefined}
                controls
                muted
                playsInline
                loop
                preload="metadata"
                className="aspect-square w-full object-contain"
              />
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                <CheckCircle2 size={11} /> Uploaded
              </span>
            </div>

            <div className="flex flex-1 flex-col">
              {/* Metadata chips */}
              <div className="flex flex-wrap gap-2">
                {formatDuration(value.duration) && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    <Clock size={12} /> {formatDuration(value.duration)}
                  </span>
                )}
                {formatSize(value.fileSize) && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    <HardDrive size={12} /> {formatSize(value.fileSize)}
                  </span>
                )}
                {resolution && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    <Film size={12} /> {resolution}
                  </span>
                )}
              </div>

              {/* Poster preview */}
              <div className="mt-3 flex items-center gap-2">
                {value.posterImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={value.posterImageUrl}
                    alt="Poster"
                    className="size-12 rounded-md border border-gray-200 object-cover"
                  />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-md border border-dashed border-gray-300 text-gray-300">
                    <ImageIcon size={16} />
                  </div>
                )}
                <div className="text-[11px] text-gray-400">
                  <p className="font-medium text-gray-600">Poster</p>
                  <p>{value.posterImageUrl ? "Auto-generated" : "None"}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <RefreshCw size={13} /> Replace video
                </button>
                <button
                  type="button"
                  onClick={() => posterInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <ImageIcon size={13} /> Custom poster
                </button>
                <button
                  type="button"
                  onClick={remove}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 flex items-center gap-1 text-xs text-red-600">
            <AlertCircle size={12} /> {error}
          </p>
        )}
      </div>
    </section>
  );
}
