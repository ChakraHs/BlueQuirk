"use client";

// Fullscreen image lightbox with pinch-to-zoom, pan-while-zoomed, and
// swipe-between-images — built on Pointer Events so one code path serves touch,
// pen and mouse. Dependency-free. Shows the ORIGINAL image URLs (not the
// next/image-optimised variants) so zoom reveals full resolution; off-screen
// slides stay lazy. Keyboard: ←/→ navigate, Esc closes. Desktop: wheel + double
// click to zoom.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

const MAX_SCALE = 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export default function ImageLightbox({
  images,
  startIndex,
  alt,
  onIndexChange,
  onClose,
}: {
  images: string[];
  startIndex: number;
  alt: string;
  onIndexChange?: (index: number) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [swipeX, setSwipeX] = useState(0);
  const [animating, setAnimating] = useState(true);

  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastTap = useRef(0);
  // Mutable gesture baseline captured at gesture start (avoids stale closures).
  const base = useRef({ dist: 0, scale: 1, tx: 0, ty: 0, px: 0, py: 0, mode: "none" as
    "none" | "pan" | "pinch" | "swipe" });

  const count = images.length;

  const size = useCallback(() => {
    const r = stageRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 1, h: r?.height ?? 1 };
  }, []);

  const clampPan = useCallback(
    (nx: number, ny: number, s: number) => {
      const { w, h } = size();
      const maxX = Math.max(0, ((s - 1) * w) / 2);
      const maxY = Math.max(0, ((s - 1) * h) / 2);
      return { x: clamp(nx, -maxX, maxX), y: clamp(ny, -maxY, maxY) };
    },
    [size]
  );

  const resetZoom = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const ni = clamp(next, 0, count - 1);
      setAnimating(true);
      setIndex(ni);
    },
    [count]
  );

  // Reset transform when the slide changes; report selection upward.
  useEffect(() => {
    resetZoom();
    onIndexChange?.(index);
  }, [index, resetZoom, onIndexChange]);

  // Body scroll lock + keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && scale === 1) goTo(index + 1);
      else if (e.key === "ArrowLeft" && scale === 1) goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, scale, goTo, onClose]);

  // Wheel-to-zoom (desktop) via a non-passive native listener so preventDefault works.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setAnimating(false);
      setScale((s) => {
        const ns = clamp(s - e.deltaY * 0.0025, 1, MAX_SCALE);
        if (ns === 1) {
          setTx(0);
          setTy(0);
        }
        return ns;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleTap = (e: React.PointerEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      setAnimating(true);
      if (scale > 1) {
        resetZoom();
      } else {
        const { w, h } = size();
        const r = stageRef.current!.getBoundingClientRect();
        const ox = e.clientX - r.left - w / 2;
        const oy = e.clientY - r.top - h / 2;
        const c = clampPan(-ox, -oy, 2);
        setScale(2);
        setTx(c.x);
        setTy(c.y);
      }
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setAnimating(false);
    const n = pointers.current.size;
    if (n === 2) {
      const [a, b] = [...pointers.current.values()];
      base.current = {
        ...base.current,
        dist: distance(a, b),
        scale,
        tx,
        ty,
        mode: "pinch",
      };
    } else if (n === 1) {
      base.current = {
        ...base.current,
        px: e.clientX,
        py: e.clientY,
        tx,
        ty,
        mode: scale > 1 ? "pan" : "swipe",
      };
      handleTap(e);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const n = pointers.current.size;

    if (n >= 2 && base.current.mode === "pinch") {
      const [a, b] = [...pointers.current.values()];
      const ratio = distance(a, b) / (base.current.dist || 1);
      const ns = clamp(base.current.scale * ratio, 1, MAX_SCALE);
      const c = clampPan(base.current.tx, base.current.ty, ns);
      setScale(ns);
      setTx(c.x);
      setTy(c.y);
    } else if (n === 1 && base.current.mode === "pan") {
      const dx = e.clientX - base.current.px;
      const dy = e.clientY - base.current.py;
      const c = clampPan(base.current.tx + dx, base.current.ty + dy, scale);
      setTx(c.x);
      setTy(c.y);
    } else if (n === 1 && base.current.mode === "swipe") {
      setSwipeX(e.clientX - base.current.px);
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const n = pointers.current.size;

    if (base.current.mode === "pinch") {
      if (scale <= 1.02) resetZoom();
      if (n === 1) {
        const [p] = [...pointers.current.values()];
        base.current = { ...base.current, px: p.x, py: p.y, tx, ty, mode: scale > 1 ? "pan" : "swipe" };
      } else if (n === 0) {
        base.current.mode = "none";
      }
    } else if (base.current.mode === "swipe" && n === 0) {
      const { w } = size();
      setAnimating(true);
      if (Math.abs(swipeX) > Math.min(120, w * 0.18)) {
        goTo(index + (swipeX < 0 ? 1 : -1));
      }
      setSwipeX(0);
      base.current.mode = "none";
    } else if (base.current.mode === "pan" && n === 0) {
      base.current.mode = "none";
    }
  };

  const zoomed = scale > 1;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/95 animate-[fadeIn_0.2s_ease]"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      {/* top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white/90">
        <span className="text-sm font-medium tabular-nums">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="flex size-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* stage */}
      <div
        ref={stageRef}
        className="relative flex-1 select-none overflow-hidden"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <div
          className="flex h-full w-full"
          style={{
            transform: `translateX(calc(${-index * 100}% + ${swipeX}px))`,
            transition: animating ? "transform 300ms cubic-bezier(0.22,1,0.36,1)" : "none",
          }}
        >
          {images.map((url, i) => (
            <div
              key={i}
              className="flex h-full w-full shrink-0 items-center justify-center px-2 sm:px-8"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={i === index ? alt : ""}
                draggable={false}
                loading={i === index ? "eager" : "lazy"}
                onDoubleClick={(e) => e.preventDefault()}
                className="max-h-full max-w-full object-contain"
                style={
                  i === index
                    ? {
                        transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                        transition: animating ? "transform 200ms ease-out" : "none",
                        cursor: zoomed ? "grab" : "zoom-in",
                      }
                    : undefined
                }
              />
            </div>
          ))}
        </div>

        {/* zoom hint (only when not zoomed) */}
        {!zoomed && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 sm:flex">
            <ZoomIn className="size-3.5" /> Double-cliquez ou utilisez la molette pour zoomer
          </div>
        )}

        {/* desktop arrows */}
        {count > 1 && !zoomed && (
          <>
            {index > 0 && (
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="Image précédente"
                className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:flex"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}
            {index < count - 1 && (
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="Image suivante"
                className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:flex"
              >
                <ChevronRight className="size-6" />
              </button>
            )}
          </>
        )}
      </div>

      {/* thumbnail strip */}
      {count > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
          {images.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Image ${i + 1}`}
              aria-current={i === index}
              className={`relative size-14 shrink-0 overflow-hidden rounded-md border-2 transition ${
                i === index ? "border-white" : "border-transparent opacity-50 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" draggable={false} loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
