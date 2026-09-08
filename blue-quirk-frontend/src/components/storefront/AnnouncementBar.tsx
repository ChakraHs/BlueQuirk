"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, X } from "lucide-react";
import { useCart, cartCount } from "@/lib/cart";
import { useCartQuote } from "@/lib/bundle";
import {
  readDismissed,
  addDismissed,
  needsCartContext,
  resolvePlaceholders,
} from "@/lib/announcements";
import type { AnnouncementBar as BarData, AnnouncementPublic } from "@/services/announcement.service";
import { t } from "@/lib/i18n";
import { track } from "@/lib/analytics/tracker";

const DEFAULT_BG = "#111827";
const DEFAULT_TEXT = "#ffffff";

/**
 * The storefront announcement bar. Server-hydrated (no client fetch, no layout shift),
 * it presents the eligible announcements using the admin-chosen transition — FADE or
 * SLIDE (one at a time, timed rotation) or CAROUSEL (a continuous ticker) — with
 * admin-configurable colors and speed. It resolves dynamic {placeholders} from the
 * centralized cart/discount quote, supports per-announcement dismissal, and is fully
 * accessible (keyboard, focus, aria-live, reduced-motion, RTL). Presentation only —
 * it never computes a price or discount.
 */
export default function AnnouncementBar({
  lang,
  initialBar,
}: {
  lang: string;
  initialBar: BarData;
}) {
  const isRtl = lang === "ar";
  const cart = useCart();
  const cartItems = cartCount(cart);

  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  useEffect(() => {
    const stored = readDismissed();
    if (stored.size > 0) setDismissed(stored);
  }, []);

  // A stored dismissal only hides an announcement that is CURRENTLY dismissible.
  // If the admin later makes it non-dismissible (or re-enables the bar), it must
  // always show while enabled — a stale dismissal from when it was dismissible
  // (possibly in another browser session) can never permanently hide it.
  const isHiddenByDismissal = useCallback(
    (a: AnnouncementPublic) => a.dismissible && dismissed.has(a.id),
    [dismissed]
  );

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  const barEnabled = initialBar.enabled;
  const rawItems = useMemo(
    () => (barEnabled ? initialBar.items : []),
    [barEnabled, initialBar.items]
  );

  const needsCart = useMemo(
    () => rawItems.some((a) => !isHiddenByDismissal(a) && needsCartContext(a.message)),
    [rawItems, isHiddenByDismissal]
  );
  const quoteItems = useMemo(
    () => (needsCart ? cart.map((i) => ({ id: i.id, quantity: i.quantity })) : []),
    [needsCart, cart]
  );
  const { quote } = useCartQuote(quoteItems);

  const visible = useMemo(() => {
    return rawItems
      .filter((a) => !isHiddenByDismissal(a))
      .map((a) => {
        const message = resolvePlaceholders(a.message, { quote, cartItems });
        return message ? { ...a, message } : null;
      })
      .filter((a): a is AnnouncementPublic => a !== null);
  }, [rawItems, isHiddenByDismissal, quote, cartItems]);

  // CAROUSEL (continuous right-to-left ticker) whenever the admin picked it and
  // motion is allowed. The track duplicates the content, so it loops seamlessly
  // even with a single announcement. Falls back to one-at-a-time only under
  // reduced-motion or a non-CAROUSEL animation.
  const carousel = initialBar.animation === "CAROUSEL" && !reduced && visible.length >= 1;

  // --- One-at-a-time rotation state ---
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (index >= visible.length) setIndex(0);
  }, [visible.length, index]);
  const current = visible[Math.min(index, Math.max(0, visible.length - 1))];

  useEffect(() => {
    if (carousel || visible.length <= 1 || paused || !current) return;
    const secs = current.displayDuration && current.displayDuration > 0
      ? current.displayDuration
      : initialBar.rotationSeconds;
    const id = setTimeout(() => setIndex((i) => (i + 1) % visible.length), secs * 1000);
    return () => clearTimeout(id);
  }, [carousel, visible.length, paused, current, index, initialBar.rotationSeconds]);

  // Analytics — announcement_view once per id. In carousel mode every item is on
  // screen, so record all of them; otherwise record the currently shown one.
  const viewed = useRef<Set<number>>(new Set());
  useEffect(() => {
    const toLog = carousel ? visible : current ? [current] : [];
    for (const a of toLog) {
      if (viewed.current.has(a.id)) continue;
      viewed.current.add(a.id);
      track("announcement_view", { meta: { announcementId: a.id, type: a.type } });
    }
  }, [carousel, visible, current]);

  if (!barEnabled || visible.length === 0 || !current) return null;

  const barBg = initialBar.bgColor || DEFAULT_BG;
  const barText = initialBar.textColor || DEFAULT_TEXT;
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  const onCtaClick = (a: AnnouncementPublic) =>
    track("announcement_click", { meta: { announcementId: a.id, type: a.type } });

  // ---- CAROUSEL (continuous ticker) ----
  if (carousel) {
    const durationSec = Math.max(8, visible.length * initialBar.rotationSeconds * 1.4);
    // Force LTR layout on the whole bar so the marquee's scroll geometry (block
    // anchoring + flex origin + translateX(-50%)) is identical regardless of page
    // direction. Under dir="rtl" the w-max track anchors to the right and the
    // translate pushes it off-screen, leaving the bar blank in Arabic. The animation
    // direction still flips per-locale for correct visual flow, and each item's own
    // text keeps its natural direction via dir="auto".
    return (
      <div
        dir="ltr"
        className="group relative w-full overflow-hidden"
        style={{ backgroundColor: barBg, color: barText }}
        role="region"
        aria-label={t(lang, "announcement.regionLabel")}
      >
        <div
          className="flex w-max [animation:announce-marquee_var(--dur)_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
          style={{ ["--dur" as string]: `${durationSec}s`, animationDirection: isRtl ? "reverse" : "normal" }}
        >
          {/* Each copy spans the full viewport and spreads its items across it, so
              the bar always fills the screen width and items flow continuously in
              from the right (justify-around keeps the spacing seamless at the loop
              boundary). The second copy makes the -50% translate loop gap-free. */}
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex min-w-[100vw] shrink-0 items-center justify-around gap-6 py-1.5">
              {visible.map((a) => (
                <span key={`${copy}-${a.id}`} dir="auto" className="flex items-center whitespace-nowrap px-6 text-[12px] leading-none sm:text-[13px]">
                  <Content a={a} lang={lang} Arrow={Arrow} onCtaClick={onCtaClick} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- FADE / SLIDE (one at a time) ----
  const bg = current.bgColor || barBg;
  const text = current.textColor || barText;
  const anim = reduced ? "" : initialBar.animation === "SLIDE"
    ? "motion-safe:animate-[announce-slide_.4s_ease-out]"
    : "motion-safe:animate-[announce-fade_.4s_ease-out]";

  return (
    <div
      className="relative w-full"
      style={{ backgroundColor: bg, color: text }}
      role="region"
      aria-label={t(lang, "announcement.regionLabel")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mx-auto flex min-h-[36px] max-w-7xl items-center justify-center gap-x-3 px-9 py-1.5">
        <p
          key={current.id}
          aria-live="polite"
          aria-atomic="true"
          className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center text-[12px] leading-snug sm:text-[13px] ${anim}`}
        >
          <Content a={current} lang={lang} Arrow={Arrow} onCtaClick={onCtaClick} />
        </p>
      </div>

      {current.dismissible && (
        <button
          type="button"
          onClick={() => {
            addDismissed(current.id);
            track("announcement_dismiss", { meta: { announcementId: current.id, type: current.type } });
            setDismissed((prev) => new Set(prev).add(current.id));
            setIndex(0);
          }}
          aria-label={t(lang, "announcement.dismiss")}
          className="absolute end-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full opacity-70 transition hover:bg-white/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

/** The inner content of one announcement (icon + message + optional CTA). */
function Content({
  a,
  lang,
  Arrow,
  onCtaClick,
}: {
  a: AnnouncementPublic;
  lang: string;
  Arrow: typeof ArrowRight;
  onCtaClick: (a: AnnouncementPublic) => void;
}) {
  return (
    <>
      {a.icon && <span aria-hidden className="mr-1 text-sm">{a.icon}</span>}
      <span className="font-medium" style={a.textColor ? { color: a.textColor } : undefined}>{a.message}</span>
      {a.link && (
        <Link
          href={a.link}
          onClick={() => onCtaClick(a)}
          target={a.openInNewTab ? "_blank" : undefined}
          rel={a.openInNewTab ? "noopener noreferrer" : undefined}
          className="ms-2 inline-flex items-center gap-1 whitespace-nowrap rounded-sm font-semibold underline decoration-white/40 underline-offset-2 transition hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {a.linkText || t(lang, "announcement.shopNow")}
          <Arrow size={13} className="shrink-0" aria-hidden />
        </Link>
      )}
    </>
  );
}
