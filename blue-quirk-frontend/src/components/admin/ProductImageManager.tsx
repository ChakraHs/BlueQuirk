"use client";

import { useRef, useState, useCallback } from "react";
import { Star, Trash2, UploadCloud, Loader2, GripVertical, AlertCircle } from "lucide-react";
import { ImageService } from "@/services/image.service";
import type { ProductImage } from "@/types/product";
import { thumbSrc } from "@/lib/productImage";

export type ColorOption = { id: number; label: string };

/**
 * Admin product image manager: drag & drop / multi-select upload (compressed +
 * pushed to Cloudflare), a thumbnail grid with primary selection, removal,
 * drag-to-reorder, and an optional per-image color link. Controlled — the parent
 * owns the image list.
 */
export default function ProductImageManager({
  value,
  onChange,
  colorOptions = [],
}: {
  value: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  /** Color attribute values for linking an image to a color (empty = no color attr). */
  colorOptions?: ColorOption[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<{ id: string; name: string; preview: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);

  // Ensure sortOrder = index and exactly one primary (first when none).
  const normalize = useCallback((imgs: ProductImage[]): ProductImage[] => {
    const withOrder = imgs.map((img, i) => ({ ...img, sortOrder: i }));
    if (withOrder.length > 0 && !withOrder.some((i) => i.primary)) {
      withOrder[0] = { ...withOrder[0], primary: true };
    }
    return withOrder;
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (list.length === 0) return;
      setError(null);

      const pending = list.map((f) => ({
        id: `${Date.now()}-${f.name}-${Math.random().toString(36).slice(2)}`,
        name: f.name,
        preview: URL.createObjectURL(f),
        file: f,
      }));
      setUploads((u) => [
        ...u,
        ...pending.map((p) => ({ id: p.id, name: p.name, preview: p.preview })),
      ]);

      // Upload sequentially so ordering is deterministic and the backend isn't hammered.
      let current = value;
      for (const item of pending) {
        try {
          const uploaded = await ImageService.upload(item.file);
          current = normalize([
            ...current,
            {
              id: uploaded.id,
              url: uploaded.url,
              thumbnailUrl: uploaded.thumbnailUrl,
              displayUrl: uploaded.displayUrl,
              originalUrl: uploaded.originalUrl,
              fileName: uploaded.fileName,
              primary: false,
            },
          ]);
          onChange(current);
        } catch {
          setError("Failed to upload an image. Please try again.");
        } finally {
          URL.revokeObjectURL(item.preview);
          setUploads((u) => u.filter((x) => x.id !== item.id));
        }
      }
    },
    [value, onChange, normalize]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const setPrimary = (id: number) => {
    onChange(value.map((img) => ({ ...img, primary: img.id === id })));
  };

  const remove = (id: number) => {
    onChange(normalize(value.filter((img) => img.id !== id)));
  };

  const setColor = (id: number, colorValueId: number | null) => {
    onChange(value.map((img) => (img.id === id ? { ...img, colorValueId } : img)));
  };

  // --- thumbnail drag-to-reorder ---
  const onThumbDragStart = (index: number) => {
    dragIndex.current = index;
  };
  const onThumbDrop = (index: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === index) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    onChange(normalize(next));
  };

  const ordered = [...value].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Product images
        </label>
        {value.length > 0 && (
          <span className="text-xs text-gray-400">
            {value.length} image{value.length > 1 ? "s" : ""} · click ★ to set the primary image
          </span>
        )}
      </div>

      {/* Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition ${
          dragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400"
        }`}
      >
        <UploadCloud className="mb-2 text-gray-400" size={28} />
        <p className="text-sm font-medium text-gray-600">
          Drag & drop images here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-400">
          JPG, PNG, WebP — automatically optimized by the server (thumbnail + display)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {/* Grid */}
      {(ordered.length > 0 || uploads.length > 0) && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {ordered.map((img, index) => (
            <div key={img.id} className="flex flex-col gap-1.5">
              <div
                draggable
                onDragStart={() => onThumbDragStart(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onThumbDrop(index)}
                className={`group relative aspect-square overflow-hidden rounded-lg border bg-gray-100 ${
                  img.primary ? "border-blue-500 ring-2 ring-blue-500/30" : "border-gray-200"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbSrc(img)}
                  alt={img.fileName || "Product image"}
                  className="h-full w-full object-cover"
                />

                {/* drag handle */}
                <span className="absolute left-1 top-1 rounded bg-black/40 p-0.5 text-white opacity-0 transition group-hover:opacity-100">
                  <GripVertical size={12} />
                </span>

                {/* primary badge / toggle */}
                <button
                  type="button"
                  onClick={() => setPrimary(img.id)}
                  title={img.primary ? "Primary image" : "Set as primary"}
                  className={`absolute right-1 top-1 rounded-full p-1 transition ${
                    img.primary
                      ? "bg-blue-600 text-white"
                      : "bg-black/40 text-white opacity-0 hover:bg-black/60 group-hover:opacity-100"
                  }`}
                >
                  <Star size={13} className={img.primary ? "fill-current" : ""} />
                </button>

                {/* remove */}
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  title="Remove image"
                  className="absolute bottom-1 right-1 rounded-full bg-black/40 p-1 text-white opacity-0 transition hover:bg-rose-600 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>

                {img.primary && (
                  <span className="absolute bottom-1 left-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Primary
                  </span>
                )}
              </div>

              {/* per-image color link (only when the product has a color attribute) */}
              {colorOptions.length > 0 && (
                <select
                  value={img.colorValueId ?? ""}
                  onChange={(e) =>
                    setColor(img.id, e.target.value ? Number(e.target.value) : null)
                  }
                  title="Linked color"
                  className="w-full rounded-md border border-gray-300 bg-white px-1.5 py-1 text-[11px] text-gray-700 outline-none focus:border-blue-500"
                >
                  <option value="">All colors</option>
                  {colorOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}

          {/* in-flight uploads */}
          {uploads.map((u) => (
            <div
              key={u.id}
              className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.preview} alt={u.name} className="h-full w-full object-cover opacity-40" />
              <span className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-600" size={22} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
