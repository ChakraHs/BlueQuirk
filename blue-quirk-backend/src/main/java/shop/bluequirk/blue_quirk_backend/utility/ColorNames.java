package shop.bluequirk.blue_quirk_backend.utility;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Maps a colour attribute value to a human colour name for outbound fulfilment
 * payloads (e.g. Todify), so a fulfiller sees "Noir"/"Black" instead of a raw
 * "#111827" hex code. Mirrors the storefront's {@code lib/colors.ts} named-colour
 * palette + nearest-colour matching so the backend and frontend agree on labels.
 *
 * <p>Only hex values ("#rgb" / "#rrggbb") are converted; any other value (a size
 * like "M", or an already-named colour like "Rouge") is returned unchanged.
 */
public final class ColorNames {

    private ColorNames() {}

    private record NamedColor(int r, int g, int b, String fr, String en, String ar) {}

    private static final Pattern HEX = Pattern.compile("^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$");

    private static final List<NamedColor> COLORS = List.of(
            color("#111827", "Noir", "Black", "أسود"),
            color("#f9fafb", "Blanc", "White", "أبيض"),
            color("#9ca3af", "Gris", "Gray", "رمادي"),
            color("#4b5563", "Gris foncé", "Dark grey", "رمادي داكن"),
            color("#d1d5db", "Gris clair", "Light grey", "رمادي فاتح"),
            color("#b0b3b8", "Gris chiné", "Heather grey", "رمادي مبقّع"),
            color("#ef4444", "Rouge", "Red", "أحمر"),
            color("#3b82f6", "Bleu", "Blue", "أزرق"),
            color("#1d4ed8", "Bleu roi", "Royal blue", "أزرق ملكي"),
            color("#1e3a8a", "Bleu marine", "Navy", "كحلي"),
            color("#7dd3fc", "Bleu ciel", "Sky blue", "أزرق سماوي"),
            color("#22c55e", "Vert", "Green", "أخضر"),
            color("#166534", "Vert foncé", "Forest green", "أخضر داكن"),
            color("#eab308", "Jaune", "Yellow", "أصفر"),
            color("#d4a017", "Moutarde", "Mustard", "خردلي"),
            color("#f97316", "Orange", "Orange", "برتقالي"),
            color("#ec4899", "Rose", "Pink", "وردي"),
            color("#8b5cf6", "Violet", "Purple", "بنفسجي"),
            color("#92400e", "Marron", "Brown", "بني"),
            color("#7f1d1d", "Bordeaux", "Maroon", "خمري"),
            color("#e7d8c1", "Beige", "Beige", "بيج"),
            color("#f5f0e1", "Crème", "Cream", "كريمي"),
            color("#14b8a6", "Turquoise", "Turquoise", "فيروزي"),
            color("#06b6d4", "Cyan", "Cyan", "سماوي"),
            color("#d4af37", "Or", "Gold", "ذهبي"),
            color("#c0c0c0", "Argent", "Silver", "فضي")
    );

    private static NamedColor color(String hex, String fr, String en, String ar) {
        int[] rgb = rgb(hex);
        return new NamedColor(rgb[0], rgb[1], rgb[2], fr, en, ar);
    }

    /**
     * Human colour name for a value, localized to {@code lang} ("fr" default,
     * "en", "ar"). A hex value resolves to the nearest named colour; any other
     * value is returned unchanged.
     */
    public static String toName(String value, String lang) {
        if (value == null) return null;
        String v = value.trim();
        if (!HEX.matcher(v).matches()) return value; // size / already a name
        int[] target = rgb(v);
        NamedColor best = null;
        long bestDist = Long.MAX_VALUE;
        for (NamedColor c : COLORS) {
            long d = sq(c.r() - target[0]) + sq(c.g() - target[1]) + sq(c.b() - target[2]);
            if (d < bestDist) {
                bestDist = d;
                best = c;
            }
        }
        if (best == null) return value;
        return switch (lang == null ? "fr" : lang.toLowerCase(Locale.ROOT)) {
            case "ar" -> best.ar();
            case "en" -> best.en();
            default -> best.fr();
        };
    }

    private static long sq(int x) {
        return (long) x * x;
    }

    private static int[] rgb(String hex) {
        String h = hex.replace("#", "");
        if (h.length() == 3) {
            StringBuilder sb = new StringBuilder();
            for (char c : h.toCharArray()) sb.append(c).append(c);
            h = sb.toString();
        }
        return new int[] {
                Integer.parseInt(h.substring(0, 2), 16),
                Integer.parseInt(h.substring(2, 4), 16),
                Integer.parseInt(h.substring(4, 6), 16)
        };
    }
}
