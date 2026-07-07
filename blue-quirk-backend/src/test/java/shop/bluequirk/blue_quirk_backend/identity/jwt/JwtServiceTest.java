package shop.bluequirk.blue_quirk_backend.identity.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;
import shop.bluequirk.blue_quirk_backend.identity.role.Role;

class JwtServiceTest {

    private IdentityProperties props;
    private JwtDecoder decoder;
    private JwtEncoder encoder;
    private JwtService jwtService;

    private static SecretKey deriveKey(String secret) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-512").digest(secret.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(digest, "HmacSHA512");
    }

    @BeforeEach
    void setUp() throws Exception {
        props = new IdentityProperties();
        props.getJwt().setSecret("unit-test-secret-value-long-enough-000000000000");
        props.getJwt().setAccessTokenTtl(Duration.ofMinutes(15));
        SecretKey key = deriveKey(props.getJwt().getSecret());
        decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS512).build();
        encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        jwtService = new JwtService(encoder, props);
    }

    private User adminUser() {
        User u = new User();
        u.setId(42L);
        u.setEmail("admin@bluequirk.shop");
        u.setName("Admin");
        u.setEmailVerified(true);
        Role admin = new Role("admin", "Admin");
        u.addRole(admin);
        return u;
    }

    @Test
    void issuesTokenWithExpectedClaims() {
        String token = jwtService.generateAccessToken(adminUser());
        Jwt jwt = decoder.decode(token);

        assertThat(jwt.getSubject()).isEqualTo("42");
        assertThat(jwt.getClaimAsString("email")).isEqualTo("admin@bluequirk.shop");
        assertThat(jwt.getClaimAsStringList("roles")).contains("admin");
        assertThat(jwt.getClaimAsStringList("authorities")).contains("admin");
        assertThat(jwt.getClaimAsString("iss")).isEqualTo("bluequirk");
    }

    @Test
    void rejectsTamperedToken() {
        String token = jwtService.generateAccessToken(adminUser());
        String tampered = token.substring(0, token.length() - 2)
                + (token.endsWith("A") ? "B" : "A");
        assertThatThrownBy(() -> decoder.decode(tampered)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsGarbageToken() {
        assertThatThrownBy(() -> decoder.decode("not-a-jwt")).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsExpiredToken() {
        // Craft a token that expired well beyond the decoder's default clock skew.
        Instant issued = Instant.now().minus(10, ChronoUnit.MINUTES);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("bluequirk")
                .issuedAt(issued)
                .expiresAt(issued.plus(1, ChronoUnit.MINUTES)) // expired ~9 min ago
                .subject("42")
                .build();
        String token = encoder.encode(
                JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS512).build(), claims)).getTokenValue();

        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }
}
