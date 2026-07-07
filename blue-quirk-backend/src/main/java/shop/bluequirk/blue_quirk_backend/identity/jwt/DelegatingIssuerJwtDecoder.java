package shop.bluequirk.blue_quirk_backend.identity.jwt;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.util.StringUtils;

import com.nimbusds.jwt.JWTParser;

/**
 * The coexistence linchpin. Routes JWT validation by the token's {@code iss} claim:
 * <ul>
 *   <li>native tokens ({@code iss = bluequirk}) → HS512 decoder;</li>
 *   <li>anything else (legacy Keycloak tokens) → the Keycloak JWKS decoder.</li>
 * </ul>
 * This lets the app validate both token types simultaneously during the migration.
 * Once Keycloak is decommissioned, {@code keycloakJwkSetUri} is left blank and only
 * native decoding remains — no code change required.
 */
public class DelegatingIssuerJwtDecoder implements JwtDecoder {

    private static final Logger LOG = LoggerFactory.getLogger(DelegatingIssuerJwtDecoder.class);

    private final JwtDecoder nativeDecoder;
    private final String nativeIssuer;
    private final JwtDecoder keycloakDecoder; // may be null after Keycloak removal

    public DelegatingIssuerJwtDecoder(JwtDecoder nativeDecoder, String nativeIssuer, String keycloakJwkSetUri) {
        this.nativeDecoder = nativeDecoder;
        this.nativeIssuer = nativeIssuer;
        this.keycloakDecoder = StringUtils.hasText(keycloakJwkSetUri)
                ? NimbusJwtDecoder.withJwkSetUri(keycloakJwkSetUri).build()
                : null;
    }

    @Override
    public Jwt decode(String token) {
        String issuer = extractIssuer(token);
        if (nativeIssuer.equals(issuer) || keycloakDecoder == null) {
            return nativeDecoder.decode(token);
        }
        return keycloakDecoder.decode(token);
    }

    private String extractIssuer(String token) {
        try {
            return JWTParser.parse(token).getJWTClaimsSet().getIssuer();
        } catch (Exception e) {
            LOG.debug("Could not parse JWT issuer, defaulting to native decoder: {}", e.getMessage());
            return null;
        }
    }
}
