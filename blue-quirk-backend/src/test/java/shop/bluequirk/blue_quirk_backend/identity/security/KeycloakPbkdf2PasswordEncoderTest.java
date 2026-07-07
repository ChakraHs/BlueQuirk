package shop.bluequirk.blue_quirk_backend.identity.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

import org.junit.jupiter.api.Test;

/** Proves that a Keycloak-format PBKDF2 hash verifies, enabling lazy migration. */
class KeycloakPbkdf2PasswordEncoderTest {

    private static String buildHash(String algorithm, int iterations, String password) throws Exception {
        byte[] salt = new byte[16];
        new java.security.SecureRandom().nextBytes(salt);
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, 512);
        byte[] hash = SecretKeyFactory.getInstance(algorithm).generateSecret(spec).getEncoded();
        // Format matches what the DelegatingPasswordEncoder passes to matches():
        // {iterations}${saltB64}${hashB64}
        return iterations + "$" + Base64.getEncoder().encodeToString(salt)
                + "$" + Base64.getEncoder().encodeToString(hash);
    }

    @Test
    void verifiesSha256Hash() throws Exception {
        String encoded = buildHash("PBKDF2WithHmacSHA256", 27500, "secret-pass");
        KeycloakPbkdf2PasswordEncoder encoder = KeycloakPbkdf2PasswordEncoder.sha256();

        assertThat(encoder.matches("secret-pass", encoded)).isTrue();
        assertThat(encoder.matches("wrong-pass", encoded)).isFalse();
        assertThat(encoder.upgradeEncoding(encoded)).isTrue();
    }

    @Test
    void verifiesSha512Hash() throws Exception {
        String encoded = buildHash("PBKDF2WithHmacSHA512", 210000, "another-pass");
        KeycloakPbkdf2PasswordEncoder encoder = KeycloakPbkdf2PasswordEncoder.sha512();

        assertThat(encoder.matches("another-pass", encoded)).isTrue();
        assertThat(encoder.matches("nope", encoded)).isFalse();
    }

    @Test
    void returnsFalseOnMalformedHash() {
        assertThat(KeycloakPbkdf2PasswordEncoder.sha256().matches("x", "garbage")).isFalse();
    }
}
