package shop.bluequirk.blue_quirk_backend.identity.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.provider.EmailProvider;

/**
 * Sends Identity Domain transactional emails (verification, password reset) through
 * the existing {@link EmailProvider} bean — no separate mail stack. Links point at
 * the storefront using the configured public frontend base URL.
 */
@Service
public class IdentityEmailService {

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
                <p>Welcome to BlueQuirk! Please confirm your email address by clicking the link below:</p>
                <p><a href="%s">Verify my email</a></p>
                <p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
                """.formatted(escape(name), link);
        emailProvider.sendHtmlEmail(to, "Verify your BlueQuirk email", html);
    }

    public void sendPasswordResetEmail(String to, String name, String rawToken) {
        String link = frontendBaseUrl + "/reset-password?token=" + rawToken;
        String html = """
                <p>Hello %s,</p>
                <p>We received a request to reset your BlueQuirk password. Click the link below to choose a new one:</p>
                <p><a href="%s">Reset my password</a></p>
                <p>This link expires in 30 minutes. If you didn't request this, no action is needed — your password stays the same.</p>
                """.formatted(escape(name), link);
        emailProvider.sendHtmlEmail(to, "Reset your BlueQuirk password", html);
    }

    private String escape(String s) {
        return s == null ? "" : s.replace("<", "&lt;").replace(">", "&gt;");
    }
}
