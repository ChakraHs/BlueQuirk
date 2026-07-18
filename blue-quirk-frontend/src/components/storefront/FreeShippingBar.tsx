"use client";

// Dynamic free-shipping progress bar for the cart / checkout. Reads the threshold
// from the backend-driven shipping config and updates automatically as the
// subtotal changes (the parent passes a live cart subtotal).
import { Truck, PartyPopper } from "lucide-react";
import { useShippingConfig, freeShippingState, isFreeShippingCampaign } from "@/lib/shipping";
import { formatPrice } from "@/lib/money";

const COPY = {
  fr: {
    away: (amount: string) => (
      <>
        Plus que <strong>{amount}</strong> pour profiter de la{" "}
        <strong>LIVRAISON GRATUITE</strong> !
      </>
    ),
    qualified: (
      <>
        🎉 Félicitations ! Votre commande bénéficie de la{" "}
        <strong>LIVRAISON GRATUITE</strong>.
      </>
    ),
  },
  ar: {
    away: (amount: string) => (
      <>
        تبقّى <strong>{amount}</strong> فقط للاستفادة من{" "}
        <strong>الشحن المجاني</strong> !
      </>
    ),
    qualified: (
      <>
        🎉 تهانينا ! طلبك مؤهّل للحصول على <strong>الشحن المجاني</strong>.
      </>
    ),
  },
  en: {
    away: (amount: string) => (
      <>
        Only <strong>{amount}</strong> away from{" "}
        <strong>FREE SHIPPING</strong>!
      </>
    ),
    qualified: (
      <>
        🎉 Congratulations! Your order qualifies for{" "}
        <strong>FREE SHIPPING</strong>.
      </>
    ),
  },
} as const;

export default function FreeShippingBar({
  subtotal,
  lang = "fr",
  className = "",
}: {
  subtotal: number;
  lang?: string;
  className?: string;
}) {
  const config = useShippingConfig();
  const { qualified, remaining, percent, threshold } = freeShippingState(subtotal, config);
  const t = lang === "ar" ? COPY.ar : lang === "en" ? COPY.en : COPY.fr;
  const campaign = isFreeShippingCampaign(config);

  // Feature disabled (no threshold configured) and no active campaign → nothing.
  if (threshold <= 0 && !campaign) return null;

  return (
    <div
      className={`rounded-xl border p-4 ${
        qualified ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"
      } ${className}`}
      dir={lang === "ar" ? "rtl" : "ltr"}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2.5">
        <span className={qualified ? "text-emerald-600" : "text-blue-600"}>
          {qualified ? <PartyPopper className="size-5" /> : <Truck className="size-5" />}
        </span>
        <p className={`text-sm leading-snug ${qualified ? "text-emerald-800" : "text-gray-700"}`}>
          {qualified ? t.qualified : t.away(formatPrice(remaining))}
        </p>
      </div>

      {/* During the free-shipping campaign every order already ships free, so the
          "progress toward the threshold" bar is meaningless — hide it. */}
      {!campaign && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              qualified ? "bg-emerald-500" : "bg-blue-600"
            }`}
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
    </div>
  );
}
