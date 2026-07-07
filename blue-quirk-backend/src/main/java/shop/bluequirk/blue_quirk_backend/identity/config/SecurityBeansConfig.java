package shop.bluequirk.blue_quirk_backend.identity.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

import shop.bluequirk.blue_quirk_backend.identity.security.KeycloakPbkdf2PasswordEncoder;

/**
 * Wires the cryptographic beans for the Identity Domain: the symmetric signing key,
 * the HS512 JWT encoder/decoder pair, and the delegating password encoder (BCrypt
 * for all new/updated passwords, plus a verify-only encoder for hashes imported
 * from Keycloak so migrated users are lazily upgraded to BCrypt on next login).
 */
@Configuration
public class SecurityBeansConfig {

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

    /** Resource-server decoder for native HS512 tokens. */
    @Bean
    public JwtDecoder jwtDecoder(SecretKey jwtSigningKey) {
        return NimbusJwtDecoder.withSecretKey(jwtSigningKey).macAlgorithm(MacAlgorithm.HS512).build();
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
