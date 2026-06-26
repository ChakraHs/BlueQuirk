"use client";

// Modern product gallery (Zara / ASOS style), dependency-free.
// - Desktop: vertical thumbnails (hover/click to switch) + a sliding main image
//   with smooth transitions, prev/next arrows, and a hover magnifier that loads
//   the ORIGINAL hi-res image (via background-image) only on hover.
// - Mobile: finger-following swipe between slides + dot indicators; tap opens a
//   fullscreen lightbox (pinch-zoom / pan / swipe).
// All image/colour logic stays in the parent; this component only renders the
// images it is given and reports the active one back.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import type { ProductImage } from "@/types/product";
import { displaySrc, originalSrc, thumbSrc } from "@/lib/productImage";
import ImageLightbox from "./ImageLightbox";

const SWIPE_THRESHOLD = 45; // px before a touch drag commits to the next slide

/** True on devices with a precise hover pointer (desktop) → enable the magnifier. */
function useHoverCapable() {
  const [hover, setHover] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return hover;
}

export default function ProductGallery({
  images,
  alt,
  onActiveChange,
}: {
  images: ProductImage[];
  alt: string;
  onActiveChange?: (url: string) => void;
}) {
  // Per-surface variants so the page only loads what it needs:
  //  - display: the main image + hover magnifier (loaded with the page; the
  //    magnifier reuses this exact URL so hovering fires no extra request).
  //  - thumb: the small side thumbnails + the active-image mirror reported to
  //    the parent (used for the cart line / wishlist).
  //  - original: full-res, handed to the lightbox and only fetched when the user
  //    opens fullscreen zoom.
  const displayUrls = useMemo(() => images.map(displaySrc), [images]);
  const thumbUrls = useMemo(() => images.map(thumbSrc), [images]);
  const originalUrls = useMemo(() => images.map(originalSrc), [images]);
  const count = displayUrls.length;
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hoverCapable = useHoverCapable();

  // Reset to the first image whenever the image SET changes (e.g. colour switch).
  const signature = displayUrls.join("|");
  useEffect(() => {
    setIndex(0);
  }, [signature]);

  // Keep the active index in range if the set shrinks, and report it upward
  // (thumbnail variant — the parent uses it for the cart line / wishlist).
  const safeIndex = Math.min(index, Math.max(0, count - 1));
  useEffect(() => {
    if (thumbUrls[safeIndex]) onActiveChange?.(thumbUrls[safeIndex]);
  }, [safeIndex, thumbUrls, onActiveChange]);

  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + count) % count),
    [count]
  );

  // --- touch swipe (mobile, finger-following) ---
  const dragStartX = useRef<number | null>(null);
  const moved = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (count < 2) return;
    dragStartX.current = e.touches[0].clientX;
    moved.current = false;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.touches[0].clientX - dragStartX.current;
    if (Math.abs(dx) > 8) moved.current = true;
    setDragX(dx);
  };
  const onTouchEnd = () => {
    if (dragStartX.current === null) return;
    const dx = dragX;
    dragStartX.current = null;
    setDragging(false);
    setDragX(0);
    if (Math.abs(dx) > SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
  };

  // --- desktop hover magnifier ---
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);
  const onMouseMove = (e: React.MouseEvent) => {
    if (!hoverCapable) return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoomPos({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  };

  const openLightbox = () => {
    // Ignore the click that ends a swipe.
    if (moved.current) {
      moved.current = false;
      return;
    }
    setLightboxOpen(true);
  };

  const trackStyle = {
    transform: `translateX(calc(${-safeIndex * 100}% + ${dragX}px))`,
    transition: dragging ? "none" : "transform 450ms cubic-bezier(0.22,1,0.36,1)",
  };

  return (
    <div className="flex gap-3 sm:gap-4">
      {/* desktop vertical thumbnails */}
      {count > 1 && (
        <div className="hidden max-h-[600px] w-16 shrink-0 flex-col gap-3 overflow-y-auto sm:flex md:w-20">
          {images.map((img, i) => (
            <button
              key={img.id ?? img.url}
              type="button"
              onMouseEnter={() => setIndex(i)}
              onClick={() => setIndex(i)}
              aria-label={`Voir l'image ${i + 1}`}
              aria-current={i === safeIndex}
              className={`relative aspect-square w-full overflow-hidden rounded-lg border-2 bg-gray-100 transition ${
                i === safeIndex ? "border-gray-900" : "border-transparent hover:border-gray-300"
              }`}
            >
              <Image src={thumbUrls[i]} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* main image */}
      <div className="min-w-0 flex-1">
        <div
          className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl bg-gray-100"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setZoomPos(null)}
          onClick={openLightbox}
        >
          {/* sliding track */}
          <div className="flex h-full w-full" style={trackStyle}>
            {images.map((img, i) => (
              <div key={img.id ?? img.url} className="relative h-full w-full shrink-0">
                <Image
                  src={displayUrls[i]}
                  alt={i === safeIndex ? alt : ""}
                  fill
                  priority={i === 0}
                  loading={i === 0 ? undefined : "lazy"}
                  sizes="(max-width: 768px) 100vw, 55vw"
                  className="object-cover"
                  draggable={false}
                />
              </div>
            ))}
          </div>

          {/* hover magnifier — reuses the already-loaded DISPLAY image (same URL
              as the main slide), so hovering fires no additional network request */}
          {hoverCapable && zoomPos && !dragging && (
            <div
              className="pointer-events-none absolute inset-0 hidden bg-no-repeat sm:block"
              style={{
                backgroundImage: `url(${displayUrls[safeIndex]})`,
                backgroundSize: "230%",
                backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
              }}
              aria-hidden
            />
          )}

          {/* expand button (desktop) */}
          {hoverCapable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              onMouseEnter={() => setZoomPos(null)}
              onMouseMove={(e) => e.stopPropagation()}
              aria-label="Agrandir"
              className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow-md backdrop-blur transition hover:bg-white group-hover:opacity-100"
            >
              <Expand className="size-4" />
            </button>
          )}

          {/* desktop arrows */}
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                onMouseEnter={() => setZoomPos(null)}
                onMouseMove={(e) => e.stopPropagation()}
                aria-label="Image précédente"
                className="absolute left-0 top-1/2 z-10 hidden h-20 w-14 -translate-y-1/2 items-center justify-start pl-3 sm:flex"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md backdrop-blur transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100">
                  <ChevronLeft className="size-5" />
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                onMouseEnter={() => setZoomPos(null)}
                onMouseMove={(e) => e.stopPropagation()}
                aria-label="Image suivante"
                className="absolute right-0 top-1/2 z-10 hidden h-20 w-14 -translate-y-1/2 items-center justify-end pr-3 sm:flex"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md backdrop-blur transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100">
                  <ChevronRight className="size-5" />
                </span>
              </button>
            </>
          )}

          {/* mobile dot indicators */}
          {count > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 sm:hidden">
              {images.map((img, i) => (
                <span
                  key={img.id ?? img.url}
                  className={`h-2 rounded-full transition-all ${
                    i === safeIndex ? "w-5 bg-gray-900" : "w-2 bg-gray-900/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {lightboxOpen && (
        <ImageLightbox
          images={originalUrls}
          startIndex={safeIndex}
          alt={alt}
          onIndexChange={setIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
