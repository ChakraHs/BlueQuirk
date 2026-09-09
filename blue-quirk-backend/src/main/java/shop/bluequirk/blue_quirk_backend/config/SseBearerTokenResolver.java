package shop.bluequirk.blue_quirk_backend.config;

import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolves the bearer token from the standard {@code Authorization} header for
 * every request, and — for the admin notification SSE stream ONLY — additionally
 * from an {@code ?access_token=} query parameter.
 *
 * <p>This narrow exception exists because the browser's native {@code EventSource}
 * cannot set request headers, so the short-lived (15 min) access token must ride
 * in the query string for that one endpoint. Every other endpoint still requires
 * the header, so tokens are never generally accepted from the URL. The token is
 * still fully validated by the resource server and the admin authority is still
 * enforced.
 */
@Component
public class SseBearerTokenResolver implements BearerTokenResolver {

    private static final String STREAM_PATH = "/api/admin/notifications/stream";

    private final DefaultBearerTokenResolver headerResolver = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        String fromHeader = headerResolver.resolve(request);
        if (fromHeader != null) {
            return fromHeader;
        }
        String uri = request.getRequestURI();
        if (uri != null && uri.endsWith(STREAM_PATH)) {
            String fromQuery = request.getParameter("access_token");
            if (fromQuery != null && !fromQuery.isBlank()) {
                return fromQuery;
            }
        }
        return null;
    }
}
