package shop.bluequirk.blue_quirk_backend.identity.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Central, typed configuration for the Identity Domain. Bound from the
 * {@code bluequirk.security.*} keys (see application.properties); every value is
 * overridable per environment via an env var.
 */
@Component
@ConfigurationProperties(prefix = "bluequirk.security")
public class IdentityProperties {

    private final Jwt jwt = new Jwt();
    private final Refresh refresh = new Refresh();
    private final Lockout lockout = new Lockout();
    private final Tokens tokens = new Tokens();
    private final RateLimit rateLimit = new RateLimit();
    private final Migration migration = new Migration();

    public Jwt getJwt() { return jwt; }
    public Refresh getRefresh() { return refresh; }
    public Lockout getLockout() { return lockout; }
    public Tokens getTokens() { return tokens; }
    public RateLimit getRateLimit() { return rateLimit; }
    public Migration getMigration() { return migration; }

    public static class Migration {
        /** Path to a Keycloak realm export JSON. When set, users are imported on startup. */
        private String keycloakExportFile = "";
        public String getKeycloakExportFile() { return keycloakExportFile; }
        public void setKeycloakExportFile(String keycloakExportFile) { this.keycloakExportFile = keycloakExportFile; }
    }

    public static class Jwt {
        /** HMAC secret; MUST be overridden via JWT_SECRET in every real environment. */
        private String secret = "change-me-in-production-this-is-only-a-dev-fallback-secret-value";
        private String issuer = "bluequirk";
        private Duration accessTokenTtl = Duration.ofMinutes(15);
        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
        public String getIssuer() { return issuer; }
        public void setIssuer(String issuer) { this.issuer = issuer; }
        public Duration getAccessTokenTtl() { return accessTokenTtl; }
        public void setAccessTokenTtl(Duration accessTokenTtl) { this.accessTokenTtl = accessTokenTtl; }
    }

    public static class Refresh {
        private Duration ttl = Duration.ofDays(7);
        private Duration rememberMeTtl = Duration.ofDays(30);
        public Duration getTtl() { return ttl; }
        public void setTtl(Duration ttl) { this.ttl = ttl; }
        public Duration getRememberMeTtl() { return rememberMeTtl; }
        public void setRememberMeTtl(Duration rememberMeTtl) { this.rememberMeTtl = rememberMeTtl; }
    }

    public static class Lockout {
        private int maxAttempts = 5;
        private Duration duration = Duration.ofMinutes(15);
        public int getMaxAttempts() { return maxAttempts; }
        public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
        public Duration getDuration() { return duration; }
        public void setDuration(Duration duration) { this.duration = duration; }
    }

    public static class Tokens {
        private Duration verificationTtl = Duration.ofHours(24);
        private Duration resetTtl = Duration.ofMinutes(30);
        public Duration getVerificationTtl() { return verificationTtl; }
        public void setVerificationTtl(Duration verificationTtl) { this.verificationTtl = verificationTtl; }
        public Duration getResetTtl() { return resetTtl; }
        public void setResetTtl(Duration resetTtl) { this.resetTtl = resetTtl; }
    }

    public static class RateLimit {
        private int loginMaxPerMinute = 10;
        private int registerMaxPerMinute = 5;
        private int forgotPasswordMaxPerMinute = 3;
        public int getLoginMaxPerMinute() { return loginMaxPerMinute; }
        public void setLoginMaxPerMinute(int v) { this.loginMaxPerMinute = v; }
        public int getRegisterMaxPerMinute() { return registerMaxPerMinute; }
        public void setRegisterMaxPerMinute(int v) { this.registerMaxPerMinute = v; }
        public int getForgotPasswordMaxPerMinute() { return forgotPasswordMaxPerMinute; }
        public void setForgotPasswordMaxPerMinute(int v) { this.forgotPasswordMaxPerMinute = v; }
    }
}
