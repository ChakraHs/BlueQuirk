package shop.bluequirk.blue_quirk_backend.identity.security;

import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Verifies passwords against hashes exported from Keycloak, enabling <b>lazy
 * migration</b>: an existing user's Keycloak PBKDF2 hash is imported and, on their
 * next successful login, transparently re-hashed to BCrypt — no forced reset.
 *
 * <p>Hash storage format (the part after the {@code {id}} prefix that
 * {@link org.springframework.security.crypto.password.DelegatingPasswordEncoder}
 * passes in):
 * <pre>{iterations}${saltBase64}${hashBase64}</pre>
 * mapped from Keycloak's exported {@code credentialData.hashIterations},
 * {@code secretData.salt} and {@code secretData.value}.
 *
 * <p>This encoder never {@link #encode}s — new/updated passwords always use BCrypt.
 *
 * <p><b>Migration note:</b> {@code deriveKeyLengthBits} must match the realm's
 * configured value. Keycloak's default is 512 bits for both SHA-256 and SHA-512
 * providers. Verify against a real exported hash before relying on lazy migration;
 * the forced-reset fallback (null password_hash) covers any mismatch.
 */
public class KeycloakPbkdf2PasswordEncoder implements PasswordEncoder {

    public static final String ID_SHA256 = "keycloak-pbkdf2-sha256";
    public static final String ID_SHA512 = "keycloak-pbkdf2-sha512";

    private final String pbkdf2Algorithm;
    private final int deriveKeyLengthBits;

    public KeycloakPbkdf2PasswordEncoder(String pbkdf2Algorithm, int deriveKeyLengthBits) {
        this.pbkdf2Algorithm = pbkdf2Algorithm;
        this.deriveKeyLengthBits = deriveKeyLengthBits;
    }

    public static KeycloakPbkdf2PasswordEncoder sha256() {
        return new KeycloakPbkdf2PasswordEncoder("PBKDF2WithHmacSHA256", 512);
    }

    public static KeycloakPbkdf2PasswordEncoder sha512() {
        return new KeycloakPbkdf2PasswordEncoder("PBKDF2WithHmacSHA512", 512);
    }

    @Override
    public String encode(CharSequence rawPassword) {
        throw new UnsupportedOperationException(
                "Keycloak PBKDF2 encoder is verify-only; new passwords are hashed with BCrypt.");
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encoded) {
        try {
            String[] parts = encoded.split("\\$");
            if (parts.length != 3) return false;
            int iterations = Integer.parseInt(parts[0]);
            byte[] salt = Base64.getDecoder().decode(parts[1]);
            byte[] expected = Base64.getDecoder().decode(parts[2]);

            PBEKeySpec spec = new PBEKeySpec(
                    rawPassword.toString().toCharArray(), salt, iterations, deriveKeyLengthBits);
            byte[] actual = SecretKeyFactory.getInstance(pbkdf2Algorithm).generateSecret(spec).getEncoded();
            return constantTimeEquals(expected, actual);
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean upgradeEncoding(String encodedPassword) {
        // Always upgrade a legacy Keycloak hash to BCrypt once we can re-encode it.
        return true;
    }

    private static boolean constantTimeEquals(byte[] a, byte[] b) {
        if (a.length != b.length) return false;
        int result = 0;
        for (int i = 0; i < a.length; i++) result |= a[i] ^ b[i];
        return result == 0;
    }
}
