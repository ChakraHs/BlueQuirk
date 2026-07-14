package shop.bluequirk.blue_quirk_backend.identity.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.provider.EmailProvider;

/**
 * Sends Identity Domain transactional emails (verification, password reset) through
 * the existing {@link EmailProvider} bean — no separate mail stack. Links point at
 * the storefront using the configured public frontend base URL.
 *
 * <p>Sending is <b>best-effort</b>: a mail-provider outage must never fail the user
 * action that triggered it (e.g. registration). Failures are logged; the underlying
 * token still exists so the user can retry (resend verification / request reset).
 */
@Service
public class IdentityEmailService {

    private static final Logger LOG = LoggerFactory.getLogger(IdentityEmailService.class);

    private final EmailProvider emailProvider;
    private final String frontendBaseUrl;

    public IdentityEmailService(EmailProvider emailProvider,
                                @Value("${app.frontend-base-url:http://localhost:3000}") String frontendBaseUrl) {
        this.emailProvider = emailProvider;
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
    }

    public void sendVerificationEmail(String to, String name, String rawToken) {
        String link = frontendBaseUrl + "/verify-email?token=" + rawToken;
        String html = """
                <p>Hello %s,</p>
                <p>Welcome to RedQuirk! Please confirm your email address by clicking the link below:</p>
                <p><a href="%s">Verify my email</a></p>
                <p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
                """.formatted(escape(name), link);
        send(to, "Verify your RedQuirk email", html);
    }

    public void sendPasswordResetEmail(String to, String name, String rawToken) {
        String link = frontendBaseUrl + "/reset-password?token=" + rawToken;
        String html = """
                <p>Hello %s,</p>
                <p>We received a request to reset your RedQuirk password. Click the link below to choose a new one:</p>
                <p><a href="%s">Reset my password</a></p>
                <p>This link expires in 30 minutes. If you didn't request this, no action is needed — your password stays the same.</p>
                """.formatted(escape(name), link);
        send(to, "Reset your RedQuirk password", html);
    }

    private void send(String to, String subject, String html) {
        try {
            emailProvider.sendHtmlEmail(to, subject, html);
        } catch (Exception e) {
            LOG.warn("Failed to send identity email '{}' to {}: {}", subject, to, e.getMessage());
        }
    }

    private String escape(String s) {
        return s == null ? "" : s.replace("<", "&lt;").replace(">", "&gt;");
    }
}
