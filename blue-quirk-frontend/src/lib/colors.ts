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

// Canonical named colours with localized labels, used to turn a raw hex value
// (e.g. "#000000") into a human colour name at DISPLAY time (cart line, checkout
// summary, filter chips) so customers never see hex codes. Hexes mirror the
// palette above so a known name resolves to its exact entry.
type NamedColor = { hex: string; fr: string; en: string; ar: string };
const NAMED_COLORS: NamedColor[] = [
  { hex: "#111827", fr: "Noir", en: "Black", ar: "أسود" },
  { hex: "#f9fafb", fr: "Blanc", en: "White", ar: "أبيض" },
  { hex: "#9ca3af", fr: "Gris", en: "Gray", ar: "رمادي" },
  { hex: "#b0b3b8", fr: "Gris chiné", en: "Heather grey", ar: "رمادي مبقّع" },
  { hex: "#ef4444", fr: "Rouge", en: "Red", ar: "أحمر" },
  { hex: "#3b82f6", fr: "Bleu", en: "Blue", ar: "أزرق" },
  { hex: "#1d4ed8", fr: "Bleu roi", en: "Royal blue", ar: "أزرق ملكي" },
  { hex: "#1e3a8a", fr: "Bleu marine", en: "Navy", ar: "كحلي" },
  { hex: "#7dd3fc", fr: "Bleu ciel", en: "Sky blue", ar: "أزرق سماوي" },
  { hex: "#22c55e", fr: "Vert", en: "Green", ar: "أخضر" },
  { hex: "#166534", fr: "Vert foncé", en: "Forest green", ar: "أخضر داكن" },
  { hex: "#eab308", fr: "Jaune", en: "Yellow", ar: "أصفر" },
  { hex: "#d4a017", fr: "Moutarde", en: "Mustard", ar: "خردلي" },
  { hex: "#f97316", fr: "Orange", en: "Orange", ar: "برتقالي" },
  { hex: "#ec4899", fr: "Rose", en: "Pink", ar: "وردي" },
  { hex: "#8b5cf6", fr: "Violet", en: "Purple", ar: "بنفسجي" },
  { hex: "#92400e", fr: "Marron", en: "Brown", ar: "بني" },
  { hex: "#7f1d1d", fr: "Bordeaux", en: "Maroon", ar: "خمري" },
  { hex: "#e7d8c1", fr: "Beige", en: "Beige", ar: "بيج" },
  { hex: "#f5f0e1", fr: "Crème", en: "Cream", ar: "كريمي" },
  { hex: "#14b8a6", fr: "Turquoise", en: "Turquoise", ar: "فيروزي" },
  { hex: "#06b6d4", fr: "Cyan", en: "Cyan", ar: "سماوي" },
  { hex: "#d4af37", fr: "Or", en: "Gold", ar: "ذهبي" },
  { hex: "#c0c0c0", fr: "Argent", en: "Silver", ar: "فضي" },
];

function rgbOf(hex: string): [number, number, number] | null {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function localizedName(c: NamedColor, lang: string): string {
  return lang === "ar" ? c.ar : lang === "en" ? c.en : c.fr;
}

/**
 * Human colour name for an attribute value. A hex ("#000000") resolves to the
 * nearest named colour ("Noir"); a known colour name resolves to its localized
 * label; any other value (a size like "M", or an unknown name) is returned
 * unchanged. Safe to call on ANY attribute value, so display code can pipe every
 * variant label through it without first knowing which attribute is the colour.
 */
export function colorLabel(value: string, lang = "fr"): string {
  const raw = value.trim();
  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw);
  if (!isHex) {
    // Named value: map known aliases to the canonical localized label; otherwise
    // leave it (a size, or an unknown human name) exactly as-is.
    const canonicalHex = COLOR_HEX[raw.toLowerCase()];
    if (!canonicalHex) return raw;
    const exact = NAMED_COLORS.find((c) => c.hex === canonicalHex);
    return exact ? localizedName(exact, lang) : raw;
  }
  const target = rgbOf(raw);
  if (!target) return raw;
  let best: NamedColor | null = null;
  let bestDist = Infinity;
  for (const c of NAMED_COLORS) {
    const rgb = rgbOf(c.hex);
    if (!rgb) continue;
    const d =
      (rgb[0] - target[0]) ** 2 +
      (rgb[1] - target[1]) ** 2 +
      (rgb[2] - target[2]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best ? localizedName(best, lang) : raw;
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
