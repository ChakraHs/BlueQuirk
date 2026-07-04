package shop.bluequirk.blue_quirk_backend.analytics.support;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Turns a client IP into a salted SHA-256 hash. We never persist the raw IP —
 * only the hash — which lets us count uniques / cache geo lookups per IP while
 * keeping the data privacy-preserving and non-reversible without the salt.
 */
@Component
public class IpHasher {

    private final String salt;

    public IpHasher(@Value("${analytics.ip-hash-salt:bluequirk-analytics}") String salt) {
        this.salt = salt;
    }

    public String hash(String ip) {
        if (ip == null || ip.isBlank()) {
            return "unknown";
        }
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest((salt + "|" + ip).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : digest) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is always available on a standard JVM.
            return Integer.toHexString((salt + ip).hashCode());
        }
    }
}
