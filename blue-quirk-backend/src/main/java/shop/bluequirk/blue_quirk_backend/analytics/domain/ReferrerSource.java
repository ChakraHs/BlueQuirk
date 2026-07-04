package shop.bluequirk.blue_quirk_backend.analytics.domain;

/**
 * Normalized traffic source, resolved from the referrer URL host. Everything
 * that isn't a known search engine / social network and isn't the site itself
 * falls into {@link #EXTERNAL}; a missing/own-domain referrer is {@link #DIRECT}.
 */
public enum ReferrerSource {
    DIRECT,
    GOOGLE,
    BING,
    FACEBOOK,
    INSTAGRAM,
    TIKTOK,
    LINKEDIN,
    EXTERNAL
}
