import type { CSSProperties } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";

export default function Hero({
  lang = "fr",
  heroTitleFr,
  heroTitleEn,
  heroTitleAr,
  heroSubtitleFr,
  heroSubtitleEn,
  heroSubtitleAr,
  heroBtnTextColor,
  heroBtnBgColor,
  heroBgColor,
  heroImageUrl,
  heroImageMobileUrl,
}: {
  lang?: string;
  heroTitleFr?: string | null;
  heroTitleEn?: string | null;
  heroTitleAr?: string | null;
  heroSubtitleFr?: string | null;
  heroSubtitleEn?: string | null;
  heroSubtitleAr?: string | null;
  heroBtnTextColor?: string | null;
  heroBtnBgColor?: string | null;
  heroBgColor?: string | null;
  heroImageUrl?: string | null;
  heroImageMobileUrl?: string | null;
}) {
  // Pick the admin-provided copy for the active language; fall back to the
  // built-in translated copy when that language has no override.
  const titleByLang: Record<string, string | null | undefined> = {
    fr: heroTitleFr,
    en: heroTitleEn,
    ar: heroTitleAr,
  };
  const subtitleByLang: Record<string, string | null | undefined> = {
    fr: heroSubtitleFr,
    en: heroSubtitleEn,
    ar: heroSubtitleAr,
  };
  const title = titleByLang[lang]?.trim() || t(lang, "hero.title");
  const subtitle = subtitleByLang[lang]?.trim() || t(lang, "hero.subtitle");

  // Primary button styling overrides (text + background colour).
  const primaryBtnStyle: CSSProperties = {};
  if (heroBtnBgColor?.trim()) primaryBtnStyle.backgroundColor = heroBtnBgColor.trim();
  if (heroBtnTextColor?.trim()) primaryBtnStyle.color = heroBtnTextColor.trim();

  // Resolve responsive backgrounds: if only one image is set it serves both.
  const desktopBg = heroImageUrl || heroImageMobileUrl;
  const mobileBg = heroImageMobileUrl || heroImageUrl;
  const hasImage = !!desktopBg;

  // No image → use the configured color, else the default gradient.
  const useColor = !hasImage && !!heroBgColor;
  const sectionClass = hasImage
    ? "relative overflow-hidden"
    : useColor
      ? "relative overflow-hidden"
      : "relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700";
  const sectionStyle = useColor ? { backgroundColor: heroBgColor! } : undefined;

  return (
    <section className={sectionClass} style={sectionStyle}>
      {/* Background images (responsive) + readability overlay */}
      {hasImage && (
        <>
          <div
            className="absolute inset-0 hidden bg-cover bg-center sm:block"
            style={{ backgroundImage: `url(${desktopBg})` }}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-cover bg-center sm:hidden"
            style={{ backgroundImage: `url(${mobileBg})` }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-black/45" aria-hidden />
        </>
      )}

      <div className="relative mx-auto max-w-7xl px-6 py-20 text-center md:py-28">
        <div className="mx-auto max-w-2xl">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-50">
            {t(lang, "hero.badge")}
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
            {title}
          </h1>

          <p className="mx-auto mt-5 max-w-md text-lg text-blue-50/90">
            {subtitle}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/${lang}/search?q=`}
              style={primaryBtnStyle}
              className={`rounded-full px-7 py-3 text-base font-semibold shadow-sm transition hover:opacity-90 ${
                heroBtnBgColor?.trim() ? "" : "bg-white"
              } ${heroBtnTextColor?.trim() ? "" : "text-blue-700"}`}
            >
              {t(lang, "hero.shopAll")}
            </Link>
            <Link
              href={`/${lang}`}
              className="rounded-full border border-white/40 px-7 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              {t(lang, "hero.explore")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
