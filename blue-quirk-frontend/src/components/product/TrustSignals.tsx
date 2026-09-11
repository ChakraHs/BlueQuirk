import { Banknote, BadgeCheck, Headphones, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { t } from "@/lib/i18n";

/**
 * A calm purchase-reassurance strip shown below the product info. Uses ONLY facts
 * that are actually true for RedQuirk (cash on delivery, Morocco-wide delivery, no
 * online payment, quality focus, customer support) — no invented guarantees,
 * certifications, or return promises. The "verified reviews" point appears only when
 * reviews are enabled, so it never implies social proof that doesn't exist yet.
 *
 * This also carries the empty-state contract: when reviews are OFF, this legitimate
 * trust content keeps the page feeling complete instead of leaving a review-shaped gap.
 */
export default function TrustSignals({
  lang,
  reviewsEnabled,
}: {
  lang: string;
  reviewsEnabled: boolean;
}) {
  const items = [
    { icon: Banknote, label: t(lang, "trust2.cod") },
    { icon: Truck, label: t(lang, "trust2.delivery") },
    { icon: ShieldCheck, label: t(lang, "trust2.secure") },
    { icon: Sparkles, label: t(lang, "trust2.quality") },
    { icon: Headphones, label: t(lang, "trust2.support") },
    ...(reviewsEnabled ? [{ icon: BadgeCheck, label: t(lang, "trust2.reviews") }] : []),
  ];

  return (
    <section
      aria-label={t(lang, "trust2.title")}
      className="mx-auto max-w-7xl px-6 pb-2 pt-4 md:px-12"
    >
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 sm:grid-cols-3 lg:grid-cols-6">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-gray-700 shadow-sm">
              <Icon className="size-4" />
            </span>
            <span className="text-xs font-medium leading-tight text-gray-700">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
