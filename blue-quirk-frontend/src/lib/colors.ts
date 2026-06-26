// Shared colour helpers for rendering colour-attribute swatches and tinting the
// product-image background. A colour value may be a name (English or French) or
// an explicit hex (#rgb / #rrggbb).

const COLOR_HEX: Record<string, string> = {
  noir: "#111827", black: "#111827",
  blanc: "#f9fafb", white: "#f9fafb",
  gris: "#9ca3af", gray: "#9ca3af", grey: "#9ca3af",
  "heather grey": "#b0b3b8", "heather gray": "#b0b3b8",
  rouge: "#ef4444", red: "#ef4444",
  bleu: "#3b82f6", blue: "#3b82f6",
  "royal blue": "#1d4ed8", "bleu roi": "#1d4ed8",
  marine: "#1e3a8a", navy: "#1e3a8a",
  ciel: "#7dd3fc", "bleu ciel": "#7dd3fc", "sky blue": "#7dd3fc",
  vert: "#22c55e", green: "#22c55e",
  "forest green": "#166534", "vert foncé": "#166534",
  jaune: "#eab308", yellow: "#eab308",
  mustard: "#d4a017", moutarde: "#d4a017",
  orange: "#f97316",
  rose: "#ec4899", pink: "#ec4899",
  violet: "#8b5cf6", purple: "#8b5cf6", mauve: "#a78bfa",
  marron: "#92400e", brown: "#92400e",
  maroon: "#7f1d1d", bordeaux: "#7f1d1d",
  beige: "#e7d8c1", crème: "#f5f0e1", cream: "#f5f0e1",
  turquoise: "#14b8a6", cyan: "#06b6d4",
  or: "#d4af37", gold: "#d4af37",
  argent: "#c0c0c0", silver: "#c0c0c0",
};

/**
 * Resolve a colour label/value to a CSS hex for a swatch. Handles a known
 * name (fr/en), an explicit "#rrggbb"/"#rgb" value, or a neutral fallback.
 */
export function colorSwatch(value: string): string {
  const key = value.trim().toLowerCase();
  if (COLOR_HEX[key]) return COLOR_HEX[key];
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key)) return key;
  return "#d1d5db";
}

/** True if a hex colour is light (so we add a darker border for visibility). */
export function isLightColor(hex: string): boolean {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.8;
}
