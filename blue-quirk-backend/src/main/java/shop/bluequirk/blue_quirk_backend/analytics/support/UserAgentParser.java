package shop.bluequirk.blue_quirk_backend.analytics.support;

import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.analytics.domain.DeviceType;

/**
 * A deliberately lightweight, dependency-free User-Agent classifier. It resolves
 * the coarse facts analytics needs — device form factor, browser family, OS
 * family — and flags obvious bots. It is not a full UA database (that would be a
 * heavy dependency); the goal is good-enough breakdowns with near-zero cost.
 */
@Component
public class UserAgentParser {

    private static final Pattern BOT = Pattern.compile(
            "bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|ping|curl|wget|"
            + "python-requests|axios|facebookexternalhit|embedly|whatsapp|telegrambot|"
            + "google-inspectiontool|bingpreview|semrush|ahrefs|dataprovider|scan",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern TABLET = Pattern.compile(
            "ipad|tablet|playbook|silk|(android(?!.*mobile))", Pattern.CASE_INSENSITIVE);

    private static final Pattern MOBILE = Pattern.compile(
            "mobi|iphone|ipod|android|blackberry|iemobile|opera mini|windows phone",
            Pattern.CASE_INSENSITIVE);

    public ClientInfo parse(String ua) {
        if (ua == null || ua.isBlank()) {
            // No UA is itself a strong bot signal for a browser-driven tracker.
            return new ClientInfo(DeviceType.DESKTOP, "Unknown", "Unknown", true);
        }
        boolean bot = BOT.matcher(ua).find();
        DeviceType device = TABLET.matcher(ua).find() ? DeviceType.TABLET
                : MOBILE.matcher(ua).find() ? DeviceType.MOBILE
                : DeviceType.DESKTOP;
        return new ClientInfo(device, browser(ua), os(ua), bot);
    }

    private String browser(String ua) {
        String s = ua.toLowerCase();
        if (s.contains("edg/") || s.contains("edga") || s.contains("edgios")) return "Edge";
        if (s.contains("opr/") || s.contains("opera")) return "Opera";
        if (s.contains("samsungbrowser")) return "Samsung Internet";
        if (s.contains("firefox") || s.contains("fxios")) return "Firefox";
        if (s.contains("chrome") || s.contains("crios")) return "Chrome";
        if (s.contains("safari")) return "Safari";
        if (s.contains("msie") || s.contains("trident")) return "Internet Explorer";
        return "Other";
    }

    private String os(String ua) {
        String s = ua.toLowerCase();
        if (s.contains("windows")) return "Windows";
        if (s.contains("iphone") || s.contains("ipad") || s.contains("ipod") || s.contains("ios")) return "iOS";
        if (s.contains("mac os") || s.contains("macintosh")) return "macOS";
        if (s.contains("android")) return "Android";
        if (s.contains("linux")) return "Linux";
        if (s.contains("cros")) return "ChromeOS";
        return "Other";
    }
}
