"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Global top navigation progress bar (GitHub/YouTube style). Product pages fetch
 * live, so a tap has a short wait before the new page appears — without feedback
 * shoppers tap repeatedly. This fires on the click/back-forward itself (not tied
 * to prefetch or a loading boundary, unlike `useLinkStatus`), trickles toward the
 * top, and completes when the URL actually changes. Dependency-free; a safety
 * timeout guarantees it never sticks.
 */
function RouteProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (trickle.current) { clearInterval(trickle.current); trickle.current = null; }
    if (hideT.current) { clearTimeout(hideT.current); hideT.current = null; }
    if (safety.current) { clearTimeout(safety.current); safety.current = null; }
  };

  const start = () => {
    if (activeRef.current) return;
    activeRef.current = true;
    clearTimers();
    setActive(true);
    setWidth(8);
    // Ease toward ~90%, slowing near the end (real completion snaps to 100%).
    trickle.current = setInterval(() => {
      setWidth((w) => (w >= 90 ? w : Math.min(90, w + (w < 40 ? 9 : w < 70 ? 4 : 1.5))));
    }, 200);
    // Never leave the bar hanging if a navigation stalls or is aborted.
    safety.current = setTimeout(finish, 8000);
  };

  const finish = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setWidth(100);
    hideT.current = setTimeout(() => {
      setActive(false);
      setWidth(0);
    }, 250);
  };

  // Complete when the route (path or query) has actually changed.
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Ignore modified clicks / non-primary buttons (new tab, etc.).
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("download")) return;
      const targetAttr = a.getAttribute("target");
      if (targetAttr && targetAttr !== "_self") return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")
          || href.startsWith("tel:") || href.startsWith("javascript:")) return;
      let url: URL;
      try { url = new URL(a.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return; // external link
      // Same URL (or hash-only) → no real navigation.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    document.addEventListener("click", onClick, true);
    const onPop = () => start(); // back / forward
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!active) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]">
      <div
        className="h-full rounded-r-full bg-primary shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/** useSearchParams needs a Suspense boundary; the bar itself renders null when idle. */
export default function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <RouteProgressInner />
    </Suspense>
  );
}
