import { formatPrice } from "@/lib/money";
import { priceInfo } from "@/lib/productPricing";

// Shared price display used by product cards, the product page, search, related
// products — everywhere a product price is shown. Renders the previous price
// crossed out (only when a valid sale exists) followed by the prominent current
// price, plus an optional "−X%" chip. Uses the app's formatPrice() so currency
// formatting stays consistent, and the theme's sale/error color for the discount.
//
//   ~~249 DH~~  199 DH   (−20%)
//
// When there is no valid previous price, only the current price renders — no
// placeholder, no empty space.
const SIZES = {
  sm: { current: "text-base", previous: "text-xs", badge: "text-[10px] px-1 py-0.5" },
  md: { current: "text-lg", previous: "text-sm", badge: "text-[11px] px-1.5 py-0.5" },
  lg: { current: "text-2xl md:text-3xl", previous: "text-base md:text-lg", badge: "text-xs px-2 py-0.5" },
  xl: { current: "text-[2.7rem] leading-none md:text-[3.4rem]", previous: "text-base md:text-lg", badge: "text-xs px-2 py-0.5" },
} as const;

// Split "199.00 DH" (or ar "199.00 درهم") into the amount and its currency unit,
// so callers can render a big number with a smaller, quieter unit beside it.
function splitAmount(formatted: string): { amount: string; unit: string } {
  const idx = formatted.lastIndexOf(" ");
  if (idx === -1) return { amount: formatted, unit: "" };
  return { amount: formatted.slice(0, idx), unit: formatted.slice(idx + 1) };
}

export default function ProductPrice({
  price,
  compareAt,
  lang,
  size = "md",
  showDiscount = false,
  smallUnit = false,
  className = "",
}: {
  price: number;
  compareAt?: number | null;
  lang?: string;
  size?: keyof typeof SIZES;
  showDiscount?: boolean;
  // Render the currency unit ("DH"/"درهم") smaller than the amount, so a large
  // price stays compact in width — the "big number, small unit" pattern.
  smallUnit?: boolean;
  className?: string;
}) {
  const { onSale, current, previous, discountPercent } = priceInfo(price, compareAt);
  const s = SIZES[size];
  const { amount, unit } = splitAmount(formatPrice(current, lang));

  return (
    <span className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      {onSale && previous !== null && (
        <span className={`${s.previous} font-medium text-gray-400 line-through`}>
          {formatPrice(previous, lang)}
        </span>
      )}
      <span
        className={`${s.current} font-bold text-gray-900 ${
          smallUnit && unit ? "inline-flex items-center" : ""
        }`}
      >
        {smallUnit && unit ? (
          <>
            <span>{amount}</span>
            <span className="ms-1 text-[0.5em] font-semibold text-gray-500">{unit}</span>
          </>
        ) : (
          formatPrice(current, lang)
        )}
      </span>
      {onSale && showDiscount && (
        <span
          className={`${s.badge} inline-flex shrink-0 items-center rounded-full bg-error/10 font-semibold text-error`}
        >
          −{discountPercent}%
        </span>
      )}
    </span>
  );
}
