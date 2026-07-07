package shop.bluequirk.blue_quirk_backend.identity.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

import shop.bluequirk.blue_quirk_backend.identity.jwt.DelegatingIssuerJwtDecoder;
import shop.bluequirk.blue_quirk_backend.identity.security.KeycloakPbkdf2PasswordEncoder;

/**
 * Wires the cryptographic beans for the Identity Domain: the symmetric signing key,
 * the JWT encoder/decoder pair, the dual-issuer decoder used by the resource server,
 * and the delegating password encoder (BCrypt + legacy Keycloak PBKDF2 verifier).
 */
@Configuration
public class SecurityBeansConfig {

    /**
     * Kept for the coexistence window so legacy Keycloak tokens still validate.
     * Blank it (remove the property) at final cutover to disable Keycloak decoding.
     */
    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri:}")
    private String keycloakJwkSetUri;

    /** Derive a fixed 512-bit HMAC key from the configured secret (any length in). */
    @Bean
    public SecretKey jwtSigningKey(IdentityProperties props) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-512")
                    .digest(props.getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(digest, "HmacSHA512");
        } catch (Exception e) {
            throw new IllegalStateException("Unable to derive JWT signing key", e);
        }
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey jwtSigningKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSigningKey));
    }

    /** Decoder for native HS512 tokens only. */
    @Bean
    public JwtDecoder nativeJwtDecoder(SecretKey jwtSigningKey) {
        return NimbusJwtDecoder.withSecretKey(jwtSigningKey).macAlgorithm(MacAlgorithm.HS512).build();
    }

    /** Primary resource-server decoder: native + legacy Keycloak, routed by issuer. */
    @Bean
    @Primary
    public JwtDecoder jwtDecoder(JwtDecoder nativeJwtDecoder, IdentityProperties props) {
        return new DelegatingIssuerJwtDecoder(nativeJwtDecoder, props.getJwt().getIssuer(), keycloakJwkSetUri);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        String defaultId = "bcrypt";
        Map<String, PasswordEncoder> encoders = new HashMap<>();
        encoders.put("bcrypt", new BCryptPasswordEncoder(12));
        encoders.put(KeycloakPbkdf2PasswordEncoder.ID_SHA256, KeycloakPbkdf2PasswordEncoder.sha256());
        encoders.put(KeycloakPbkdf2PasswordEncoder.ID_SHA512, KeycloakPbkdf2PasswordEncoder.sha512());
        return new DelegatingPasswordEncoder(defaultId, encoders);
    }
}
