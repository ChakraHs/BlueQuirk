package shop.bluequirk.blue_quirk_backend.analytics.support;

import java.net.URI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.analytics.domain.ReferrerSource;

/**
 * Maps a raw referrer URL to a normalized {@link ReferrerSource}. A referrer on
 * our own host (or none) is {@link ReferrerSource#DIRECT}; known engines/socials
 * are named; anything else is {@link ReferrerSource#EXTERNAL}.
 */
@Component
public class ReferrerClassifier {

    private final String ownHostFragment;

    public ReferrerClassifier(
            @Value("${analytics.own-host:bluequirk}") String ownHostFragment) {
        this.ownHostFragment = ownHostFragment == null ? "" : ownHostFragment.toLowerCase();
    }

    public ReferrerSource classify(String referrer) {
        if (referrer == null || referrer.isBlank()) {
            return ReferrerSource.DIRECT;
        }
        String host;
        try {
            host = URI.create(referrer).getHost();
        } catch (Exception e) {
            return ReferrerSource.EXTERNAL;
        }
        if (host == null || host.isBlank()) {
            return ReferrerSource.DIRECT;
        }
        host = host.toLowerCase();

        if (!ownHostFragment.isBlank() && host.contains(ownHostFragment)) return ReferrerSource.DIRECT;
        if (host.contains("google.")) return ReferrerSource.GOOGLE;
        if (host.contains("bing.")) return ReferrerSource.BING;
        if (host.contains("facebook.") || host.contains("fb.")) return ReferrerSource.FACEBOOK;
        if (host.contains("instagram.")) return ReferrerSource.INSTAGRAM;
        if (host.contains("tiktok.")) return ReferrerSource.TIKTOK;
        if (host.contains("linkedin.") || host.contains("lnkd.in")) return ReferrerSource.LINKEDIN;
        return ReferrerSource.EXTERNAL;
    }
}
