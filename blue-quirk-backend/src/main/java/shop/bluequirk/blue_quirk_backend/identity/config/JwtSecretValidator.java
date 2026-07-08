package shop.bluequirk.blue_quirk_backend.identity.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * Fail-fast guard on the JWT signing secret. A weak or default secret in a
 * non-local profile (docker/prod) aborts startup rather than silently signing
 * tokens anyone could forge. In local/dev it only warns so developers aren't
 * blocked.
 */
@Component
public class JwtSecretValidator {

    private static final Logger LOG = LoggerFactory.getLogger(JwtSecretValidator.class);
    private static final int MIN_SECRET_LENGTH = 32;
    private static final String DEV_DEFAULT_PREFIX = "dev-only-change-me";

    private final IdentityProperties props;
    private final Environment environment;

    public JwtSecretValidator(IdentityProperties props, Environment environment) {
        this.props = props;
        this.environment = environment;
    }

    @PostConstruct
    void validate() {
        String secret = props.getJwt().getSecret();
        boolean weak = secret == null
                || secret.length() < MIN_SECRET_LENGTH
                || secret.startsWith(DEV_DEFAULT_PREFIX);
        if (!weak) {
            return;
        }

        boolean hardenedProfile = false;
        for (String profile : environment.getActiveProfiles()) {
            if (profile.equalsIgnoreCase("prod") || profile.equalsIgnoreCase("docker")) {
                hardenedProfile = true;
                break;
            }
        }

        String message = "JWT secret is weak or the dev default. Set a strong JWT_SECRET "
                + "(>= " + MIN_SECRET_LENGTH + " chars, e.g. `openssl rand -base64 48`).";
        if (hardenedProfile) {
            throw new IllegalStateException(message + " Refusing to start with an insecure secret.");
        }
        LOG.warn("SECURITY WARNING: {} (allowed in local/dev only).", message);
    }
}
