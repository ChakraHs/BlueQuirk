"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import type { ProductVideo } from "@/types/product";

/**
 * The gallery's video slide. Designed to be gentle on Core Web Vitals:
 *
 *  - The POSTER is what paints first (a plain <img>, eager + high priority), so
 *    it — not a video — is the LCP candidate and there is no layout shift.
 *  - The MP4 is fully LAZY: the <video> element (and therefore any network
 *    request for the clip, even metadata) is not even mounted until the gallery
 *    scrolls into view. Below-the-fold products never fetch the video at all.
 *  - Once mounted it uses preload="metadata" so only a tiny range is fetched
 *    until playback actually starts.
 *  - It never carries the `autoplay` attribute (which would fire before hydration
 *    and hurt LCP). Instead we start MUTED playback from an effect only when the
 *    slide is BOTH the active gallery slide AND visible, and pause as soon as the
 *    user navigates to another slide.
 *
 * Memoized so unrelated gallery state (hover position, drag offset…) never
 * re-renders the player.
 */
function ProductVideoSlideImpl({
  video,
  active,
  alt,
  bgColor,
}: {
  video: ProductVideo;
  active: boolean;
  alt: string;
  bgColor?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Becomes true once the gallery has been in view — gates all video networking.
  const [shouldLoad, setShouldLoad] = useState(false);
  const [visible, setVisible] = useState(false);

  // Observe visibility; mount the <video> only after the first intersection.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setShouldLoad(true);
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Start muted playback only when this slide is active AND on-screen; pause
  // otherwise (i.e. as soon as the user swipes/clicks to another slide).
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (active && visible) {
      el.muted = true;
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      el.pause();
    }
  }, [active, visible, shouldLoad]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      {shouldLoad ? (
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.posterImageUrl ?? undefined}
          playsInline
          muted
          loop
          controls
          preload="metadata"
          aria-label={alt}
          className="h-full w-full object-cover"
        />
      ) : (
        // Pre-intersection: poster only, no video network at all. This is the
        // LCP-friendly first paint.
        <>
          {video.posterImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={video.posterImageUrl}
              alt={alt}
              fetchPriority="high"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-900/90" />
          )}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
              <Play className="size-7 translate-x-0.5 fill-current" />
            </span>
          </span>
        </>
      )}
    </div>
  );
}

const ProductVideoSlide = memo(ProductVideoSlideImpl);
export default ProductVideoSlide;
