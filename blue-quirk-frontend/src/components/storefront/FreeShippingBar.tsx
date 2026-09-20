"use client";

// Dynamic free-shipping progress bar for the cart / checkout. Reads the active
// rule from the backend-driven shipping config and updates automatically as the
// cart changes. Supports two modes: by subtotal threshold (spend X more) or by
// product quantity (add N more products) — whichever the admin has enabled.
import { Truck, PartyPopper } from "lucide-react";
import { useShippingConfig, freeShippingState } from "@/lib/shipping";
import { formatPrice } from "@/lib/money";

const COPY = {
  fr: {
    away: (amount: string) => (
      <>
        Plus que <strong>{amount}</strong> pour profiter de la{" "}
        <strong>LIVRAISON GRATUITE</strong> !
      </>
    ),
    awayItems: (count: number) => (
      <>
        Ajoutez <strong>{count}</strong> {count > 1 ? "produits" : "produit"} pour
        profiter de la <strong>LIVRAISON GRATUITE</strong> !
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
    awayItems: (count: number) => (
      <>
        أضِف <strong>{count}</strong> منتجات فقط للاستفادة من{" "}
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
    awayItems: (count: number) => (
      <>
        Add <strong>{count}</strong> more {count > 1 ? "products" : "product"} for{" "}
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
  itemCount = 0,
  lang = "fr",
  className = "",
}: {
  subtotal: number;
  // Total number of products in the cart. Drives the quantity-based mode; ignored
  // in threshold mode.
  itemCount?: number;
  lang?: string;
  className?: string;
}) {
  const config = useShippingConfig();
  const state = freeShippingState(subtotal, config, itemCount);
  const { mode, qualified, remaining, percent, itemsRemaining } = state;
  const t = lang === "ar" ? COPY.ar : lang === "en" ? COPY.en : COPY.fr;

  // No free-shipping perk configured → render nothing.
  if (mode === "disabled") return null;

  // Whether to show the "progress toward the goal" bar. During the campaign every
  // order already ships free, so the progress bar is meaningless — hide it.
  const showProgress = mode === "threshold" || mode === "quantity";

  // The "keep going" message for the active mode.
  const awayMessage =
    mode === "quantity" ? t.awayItems(itemsRemaining) : t.away(formatPrice(remaining, lang));

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
          {qualified ? t.qualified : awayMessage}
        </p>
      </div>

      {showProgress && (
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
