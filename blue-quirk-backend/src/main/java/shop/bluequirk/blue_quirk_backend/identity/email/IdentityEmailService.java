package shop.bluequirk.blue_quirk_backend.identity.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.provider.EmailProvider;
import shop.bluequirk.blue_quirk_backend.utility.EmailI18n;

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
        sendVerificationEmail(to, name, rawToken, EmailI18n.DEFAULT_LANG);
    }

    public void sendVerificationEmail(String to, String name, String rawToken, String lang) {
        String l = EmailI18n.normalize(lang);
        boolean ar = "ar".equals(l);
        String link = frontendBaseUrl + "/verify-email?token=" + rawToken;
        String subject = ar ? "تأكيد بريدك الإلكتروني في RedQuirk" : "Confirmez votre e-mail RedQuirk";
        String html;
        if (ar) {
            html = wrap(l,
                    "<p>مرحبًا " + escape(name) + "،</p>"
                    + "<p>أهلًا بك في RedQuirk! يرجى تأكيد عنوان بريدك الإلكتروني بالنقر على الزر أدناه:</p>"
                    + button(link, "تأكيد بريدي الإلكتروني")
                    + "<p style='color:#6b7280;font-size:13px'>تنتهي صلاحية هذا الرابط خلال 24 ساعة. "
                    + "إذا لم تنشئ حسابًا، يمكنك تجاهل هذه الرسالة.</p>");
        } else {
            html = wrap(l,
                    "<p>Bonjour " + escape(name) + ",</p>"
                    + "<p>Bienvenue chez RedQuirk ! Merci de confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous :</p>"
                    + button(link, "Confirmer mon e-mail")
                    + "<p style='color:#6b7280;font-size:13px'>Ce lien expire dans 24 heures. "
                    + "Si vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail.</p>");
        }
        send(to, subject, html);
    }

    public void sendPasswordResetEmail(String to, String name, String rawToken) {
        sendPasswordResetEmail(to, name, rawToken, EmailI18n.DEFAULT_LANG);
    }

    public void sendPasswordResetEmail(String to, String name, String rawToken, String lang) {
        String l = EmailI18n.normalize(lang);
        boolean ar = "ar".equals(l);
        String link = frontendBaseUrl + "/reset-password?token=" + rawToken;
        String subject = ar ? "إعادة تعيين كلمة مرور RedQuirk" : "Réinitialisez votre mot de passe RedQuirk";
        String html;
        if (ar) {
            html = wrap(l,
                    "<p>مرحبًا " + escape(name) + "،</p>"
                    + "<p>تلقّينا طلبًا لإعادة تعيين كلمة مرور حسابك في RedQuirk. انقر على الزر أدناه لاختيار كلمة مرور جديدة:</p>"
                    + button(link, "إعادة تعيين كلمة المرور")
                    + "<p style='color:#6b7280;font-size:13px'>تنتهي صلاحية هذا الرابط خلال 30 دقيقة. "
                    + "إذا لم تطلب ذلك، فلا حاجة لأي إجراء — تبقى كلمة مرورك كما هي.</p>");
        } else {
            html = wrap(l,
                    "<p>Bonjour " + escape(name) + ",</p>"
                    + "<p>Nous avons reçu une demande de réinitialisation de votre mot de passe RedQuirk. "
                    + "Cliquez sur le bouton ci-dessous pour en choisir un nouveau :</p>"
                    + button(link, "Réinitialiser mon mot de passe")
                    + "<p style='color:#6b7280;font-size:13px'>Ce lien expire dans 30 minutes. "
                    + "Si vous n'êtes pas à l'origine de cette demande, aucune action n'est nécessaire — "
                    + "votre mot de passe reste inchangé.</p>");
        }
        send(to, subject, html);
    }

    /** Minimal branded, direction-aware wrapper shared by identity emails. */
    private String wrap(String lang, String inner) {
        return "<div dir='" + EmailI18n.dir(lang) + "' style='font-family:Arial,Helvetica,sans-serif;"
                + "max-width:520px;margin:0 auto;color:#111827;text-align:" + EmailI18n.startAlign(lang) + "'>"
                + "<div style='font-size:22px;font-weight:800;padding:8px 0'>"
                + "Red<span style='color:#dc2626'>Quirk</span></div>"
                + inner + "</div>";
    }

    private String button(String href, String label) {
        return "<p style='margin:18px 0'><a href='" + href + "' "
                + "style='display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;"
                + "font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px'>" + label + "</a></p>";
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
