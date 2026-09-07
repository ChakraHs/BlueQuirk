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
} as const;

export default function ProductPrice({
  price,
  compareAt,
  size = "md",
  showDiscount = false,
  className = "",
}: {
  price: number;
  compareAt?: number | null;
  size?: keyof typeof SIZES;
  showDiscount?: boolean;
  className?: string;
}) {
  const { onSale, current, previous, discountPercent } = priceInfo(price, compareAt);
  const s = SIZES[size];

  return (
    <span className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      {onSale && previous !== null && (
        <span className={`${s.previous} font-medium text-gray-400 line-through`}>
          {formatPrice(previous)}
        </span>
      )}
      <span className={`${s.current} font-bold text-gray-900`}>{formatPrice(current)}</span>
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
