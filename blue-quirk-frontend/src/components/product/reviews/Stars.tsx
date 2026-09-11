import { Star } from "lucide-react";

/**
 * A compact, accessible star row. Supports a fractional `value` (e.g. 4.6) rendered
 * with a clipped overlay so half-ish ratings read honestly — no rounding up to look
 * better than the real data. Presentational only.
 */
export default function Stars({
  value,
  size = 16,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const label = `${clamped.toFixed(1)} / 5`;
  return (
    <span
      className={`relative inline-flex ${className}`}
      role="img"
      aria-label={label}
      style={{ width: size * 5, height: size }}
    >
      {/* empty track */}
      <span className="absolute inset-0 flex text-gray-300">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} style={{ width: size, height: size }} strokeWidth={1.5} />
        ))}
      </span>
      {/* filled overlay, clipped to the exact fraction */}
      <span
        className="absolute inset-0 flex overflow-hidden text-amber-400"
        style={{ width: `${(clamped / 5) * 100}%` }}
        aria-hidden
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size, flex: "0 0 auto" }}
            className="fill-amber-400"
            strokeWidth={1.5}
          />
        ))}
      </span>
    </span>
  );
}
