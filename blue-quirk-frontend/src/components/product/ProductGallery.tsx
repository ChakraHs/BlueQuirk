"use client";

// Modern product gallery (Zara / ASOS style), dependency-free.
// - Desktop: vertical thumbnails (hover/click to switch) + a sliding main image
//   with smooth transitions, prev/next arrows, and a hover magnifier that loads
//   the ORIGINAL hi-res image (via background-image) only on hover.
// - Mobile: finger-following swipe between slides + dot indicators; tap opens a
//   fullscreen lightbox (pinch-zoom / pan / swipe).
// An OPTIONAL featured video integrates as the SECOND slide when present (the
// FIRST slide stays the primary image, which is best for LCP): the image paints
// first with priority, the MP4 stays fully lazy, and the video autoplays muted
// only once the user navigates to it and it is on-screen, pausing when they move
// away (see ProductVideoSlide). Everything else — zoom, swipe, arrows,
// thumbnails, lightbox — is unchanged and applies to the image slides exactly as
// before. When there is no video the gallery behaves identically to the
// image-only version.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, Play } from "lucide-react";
import type { ProductImage, ProductVideo } from "@/types/product";
import { displaySrc, originalSrc, thumbSrc } from "@/lib/productImage";
import ImageLightbox from "./ImageLightbox";
import ProductVideoSlide from "./ProductVideoSlide";

const SWIPE_THRESHOLD = 45; // px before a touch drag commits to the next slide

/** A gallery slide is either one of the product images or the featured video. */
type Slide =
  | { kind: "image"; imageIndex: number }
  | { kind: "video" };

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
  video,
  alt,
  onActiveChange,
  bgColor,
}: {
  images: ProductImage[];
  /** Optional featured video shown as the second slide (after the first image). */
  video?: ProductVideo | null;
  alt: string;
  onActiveChange?: (url: string) => void;
  /** Background tint behind the (often transparent) product image. */
  bgColor?: string;
}) {
  const hasVideo = !!video?.videoUrl;

  // Per-surface image variants so the page only loads what it needs:
  //  - display: the main image + hover magnifier (loaded with the page; the
  //    magnifier reuses this exact URL so hovering fires no extra request).
  //  - thumb: the small side thumbnails + the active-image mirror reported to
  //    the parent (used for the cart line / wishlist).
  //  - original: full-res, handed to the lightbox and only fetched when the user
  //    opens fullscreen zoom.
  const displayUrls = useMemo(() => images.map(displaySrc), [images]);
  const thumbUrls = useMemo(() => images.map(thumbSrc), [images]);
  const originalUrls = useMemo(() => images.map(originalSrc), [images]);

  // Build the ordered slide list: the primary image is FIRST, the video (if any)
  // is inserted as the SECOND slide, then the rest of the images. With no images
  // the video stands alone.
  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    images.forEach((_, i) => {
      out.push({ kind: "image", imageIndex: i });
      if (hasVideo && i === 0) out.push({ kind: "video" });
    });
    if (hasVideo && images.length === 0) out.push({ kind: "video" });
    return out;
  }, [images, hasVideo]);

  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hoverCapable = useHoverCapable();

  // Reset to the first slide whenever the image SET changes (e.g. colour switch).
  const signature = displayUrls.join("|");
  useEffect(() => {
    setIndex(0);
  }, [signature]);

  const safeIndex = Math.min(index, Math.max(0, count - 1));
  const activeSlide = slides[safeIndex];
  const onVideoSlide = activeSlide?.kind === "video";
  const activeImageIndex = activeSlide?.kind === "image" ? activeSlide.imageIndex : -1;

  // Slide index of a given image index (for lightbox round-trips).
  const slideOfImage = useCallback(
    (imageIdx: number) => slides.findIndex((s) => s.kind === "image" && s.imageIndex === imageIdx),
    [slides]
  );

  // Report the active image (thumbnail variant) upward for the cart line /
  // wishlist. On the video slide we mirror the first image (or the poster) so the
  // parent always has a usable still.
  useEffect(() => {
    if (activeImageIndex >= 0 && thumbUrls[activeImageIndex]) {
      onActiveChange?.(thumbUrls[activeImageIndex]);
    } else if (thumbUrls[0]) {
      onActiveChange?.(thumbUrls[0]);
    } else if (video?.posterImageUrl) {
      onActiveChange?.(video.posterImageUrl);
    }
  }, [activeImageIndex, thumbUrls, onActiveChange, video?.posterImageUrl]);

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

  // --- desktop hover magnifier (image slides only) ---
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);
  const onMouseMove = (e: React.MouseEvent) => {
    if (!hoverCapable || onVideoSlide) return;
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
    // The lightbox is image-only; the video slide plays inline instead.
    if (activeImageIndex < 0) return;
    setLightboxOpen(true);
  };

  const trackStyle = {
    transform: `translateX(calc(${-safeIndex * 100}% + ${dragX}px))`,
    transition: dragging ? "none" : "transform 450ms cubic-bezier(0.22,1,0.36,1)",
  };

  return (
    <div className="flex gap-3 sm:gap-4">
      {/* desktop vertical thumbnails (in slide order) */}
      {count > 1 && (
        <div className="hidden max-h-[600px] w-16 shrink-0 flex-col gap-3 overflow-y-auto sm:flex md:w-20">
          {slides.map((slide, s) =>
            slide.kind === "video" ? (
              <button
                key="video-thumb"
                type="button"
                onMouseEnter={() => setIndex(s)}
                onClick={() => setIndex(s)}
                aria-label="Voir la vidéo"
                aria-current={s === safeIndex}
                style={bgColor ? { backgroundColor: bgColor } : undefined}
                className={`relative aspect-square w-full overflow-hidden rounded-lg border-2 bg-gray-900 transition ${
                  s === safeIndex ? "border-gray-900" : "border-transparent hover:border-gray-300"
                }`}
              >
                {video?.posterImageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={video.posterImageUrl}
                    alt=""
                    className="h-full w-full object-cover opacity-90"
                  />
                )}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-6 items-center justify-center rounded-full bg-black/55 text-white">
                    <Play className="size-3 translate-x-px fill-current" />
                  </span>
                </span>
              </button>
            ) : (
              <button
                key={images[slide.imageIndex].id ?? images[slide.imageIndex].url}
                type="button"
                onMouseEnter={() => setIndex(s)}
                onClick={() => setIndex(s)}
                aria-label={`Voir l'image ${slide.imageIndex + 1}`}
                aria-current={s === safeIndex}
                style={bgColor ? { backgroundColor: bgColor } : undefined}
                className={`relative aspect-square w-full overflow-hidden rounded-lg border-2 transition ${
                  bgColor ? "" : "bg-gray-100"
                } ${s === safeIndex ? "border-gray-900" : "border-transparent hover:border-gray-300"}`}
              >
                <Image src={thumbUrls[slide.imageIndex]} alt="" fill sizes="80px" className="object-cover" />
              </button>
            )
          )}
        </div>
      )}

      {/* main stage */}
      <div className="min-w-0 flex-1">
        <div
          style={bgColor ? { backgroundColor: bgColor } : undefined}
          className={`group relative aspect-square overflow-hidden rounded-2xl ${
            onVideoSlide ? "cursor-default" : "cursor-zoom-in"
          } ${bgColor ? "" : "bg-gray-100"}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setZoomPos(null)}
          onClick={openLightbox}
        >
          {/* sliding track (slide order) */}
          <div className="flex h-full w-full" style={trackStyle}>
            {slides.map((slide) =>
              slide.kind === "video" && video ? (
                <div key="video-slide" className="relative h-full w-full shrink-0">
                  <ProductVideoSlide
                    video={video}
                    active={onVideoSlide}
                    alt={`${alt} — video`}
                    bgColor={bgColor}
                  />
                </div>
              ) : slide.kind === "image" ? (
                <div
                  key={images[slide.imageIndex].id ?? images[slide.imageIndex].url}
                  className="relative h-full w-full shrink-0"
                >
                  <Image
                    src={displayUrls[slide.imageIndex]}
                    alt={slide.imageIndex === activeImageIndex ? alt : ""}
                    fill
                    priority={slide.imageIndex === 0}
                    loading={slide.imageIndex === 0 ? undefined : "lazy"}
                    sizes="(max-width: 768px) 100vw, 55vw"
                    className="object-cover"
                    draggable={false}
                  />
                </div>
              ) : null
            )}
          </div>

          {/* hover magnifier — reuses the already-loaded DISPLAY image (same URL
              as the main slide), so hovering fires no additional network request.
              Disabled on the video slide. */}
          {hoverCapable && zoomPos && !dragging && !onVideoSlide && activeImageIndex >= 0 && (
            <div
              className="pointer-events-none absolute inset-0 hidden bg-no-repeat sm:block"
              style={{
                backgroundColor: bgColor,
                backgroundImage: `url(${displayUrls[activeImageIndex]})`,
                backgroundSize: "230%",
                backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
              }}
              aria-hidden
            />
          )}

          {/* expand button (desktop, image slides only) */}
          {hoverCapable && !onVideoSlide && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (activeImageIndex >= 0) setLightboxOpen(true);
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

          {/* mobile dot indicators (one per slide, incl. the video) */}
          {count > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 sm:hidden">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === safeIndex ? "w-5 bg-gray-900" : "w-2 bg-gray-900/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {lightboxOpen && activeImageIndex >= 0 && (
        <ImageLightbox
          images={originalUrls}
          startIndex={activeImageIndex}
          alt={alt}
          bgColor={bgColor}
          onIndexChange={(imageIdx) => {
            const s = slideOfImage(imageIdx);
            if (s >= 0) setIndex(s);
          }}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
