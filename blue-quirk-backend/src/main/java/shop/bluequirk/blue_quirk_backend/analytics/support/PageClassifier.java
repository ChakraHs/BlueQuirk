package shop.bluequirk.blue_quirk_backend.analytics.support;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.analytics.domain.PageType;

/**
 * Derives a {@link PageType} (and a productId for product pages) from a storefront
 * path — server-side, so classification can't be spoofed by the client. Locale
 * prefixes (/fr, /ar) are stripped first. Adding a future page type is a one-line
 * change here.
 */
@Component
public class PageClassifier {

    private static final Pattern LOCALE = Pattern.compile("^/(fr|ar|en)(?=/|$)");
    private static final Pattern PRODUCT = Pattern.compile("^/product/(\\d+)");

    /** Path stripped of its locale prefix and trailing slash, lower-cased. */
    public String normalize(String rawPath) {
        if (rawPath == null || rawPath.isBlank()) return "/";
        String p = rawPath;
        int q = p.indexOf('?');
        if (q >= 0) p = p.substring(0, q);
        int h = p.indexOf('#');
        if (h >= 0) p = p.substring(0, h);
        p = LOCALE.matcher(p).replaceFirst("");
        if (p.isBlank()) p = "/";
        if (p.length() > 1 && p.endsWith("/")) p = p.substring(0, p.length() - 1);
        return p.toLowerCase();
    }

    public PageType classify(String normalizedPath) {
        String p = normalizedPath;
        if (p.equals("/")) return PageType.HOME;
        if (p.startsWith("/product/")) return PageType.PRODUCT;
        if (p.startsWith("/category/")) return PageType.CATEGORY;
        if (p.startsWith("/collection")) return PageType.COLLECTION;
        if (p.startsWith("/cart")) return PageType.CART;
        if (p.startsWith("/checkout")) return PageType.CHECKOUT;
        if (p.startsWith("/wishlist")) return PageType.WISHLIST;
        if (p.startsWith("/search")) return PageType.SEARCH;
        if (p.startsWith("/about")) return PageType.ABOUT;
        if (p.startsWith("/contact")) return PageType.CONTACT;
        if (p.startsWith("/account") || p.startsWith("/profile") || p.startsWith("/orders")) return PageType.ACCOUNT;
        return PageType.OTHER;
    }

    /** Product id parsed from a normalized product path, or null. */
    public Long productId(String normalizedPath) {
        Matcher m = PRODUCT.matcher(normalizedPath);
        if (m.find()) {
            try {
                return Long.parseLong(m.group(1));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
