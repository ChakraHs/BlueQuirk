"use client";

import { useId } from "react";

export type ChartPoint = { label: string; value: number };

type Props = {
  data: ChartPoint[];
  height?: number;
  /** Stroke/fill colour (any valid CSS colour). */
  color?: string;
};

/**
 * Dependency-free SVG area/line chart. Uses a 0..100 x 0..100 viewBox and
 * preserveAspectRatio="none" so it stretches to its container width.
 */
export default function MiniLineChart({
  data,
  height = 180,
  color = "#2563eb",
}: Props) {
  const gradientId = useId();

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const stepX = n > 1 ? 100 / (n - 1) : 0;

  const points = data.map((d, i) => {
    const x = n > 1 ? i * stepX : 50;
    const y = 100 - (d.value / max) * 92 - 4; // keep 4% padding top/bottom
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    `${linePath} L${points[points.length - 1][0].toFixed(2)},100 ` +
    `L${points[0][0].toFixed(2)},100 Z`;

  return (
    <div style={{ height }} className="w-full">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
