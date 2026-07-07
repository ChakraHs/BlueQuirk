package shop.bluequirk.blue_quirk_backend.identity.security;

import jakarta.servlet.http.HttpServletRequest;

/** Extracts client metadata (IP, user-agent) for audit + session records. */
public final class RequestContext {

    private RequestContext() {}

    public static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // First hop is the original client.
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public static String userAgent(HttpServletRequest request) {
        String ua = request.getHeader("User-Agent");
        if (ua == null) return null;
        return ua.length() > 500 ? ua.substring(0, 500) : ua;
    }
}
