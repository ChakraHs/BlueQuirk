package shop.bluequirk.blue_quirk_backend.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.entity.EmailTemplate;
import shop.bluequirk.blue_quirk_backend.provider.EmailProvider;
import shop.bluequirk.blue_quirk_backend.utility.TemplateEngine;

@Service
public class EmailService {

    private final EmailProvider emailProvider;
    private final EmailTemplateService templateService;
    private final StoreSettingsService storeSettingsService;
    /** Monitored inbox used as Reply-To on custom emails so replies reach a human. */
    private final String replyToEmail;
    private final String storeName;


    public EmailService(
    		EmailProvider emailProvider,
    		 EmailTemplateService templateService,
    		 StoreSettingsService storeSettingsService,
    		 @Value("${order.admin-email:}") String adminEmail,
    		 @Value("${app.store-name:RedQuirk}") String storeName
    		) {
        this.emailProvider = emailProvider;
        this.templateService = templateService;
        this.storeSettingsService = storeSettingsService;
        this.replyToEmail = adminEmail == null ? "" : adminEmail.trim();
        this.storeName = (storeName == null || storeName.isBlank()) ? "RedQuirk" : storeName.trim();
    }

    /**
     * Sends a one-off custom email written by an admin (free subject + body) to a
     * customer. The plain-text body is wrapped in the store's branded HTML shell,
     * and {@code Reply-To} is set to the admin inbox so the customer's reply reaches
     * a human — the lightweight two-way channel until inbound routing is added.
     * Best-effort throw: the caller surfaces failures to the admin UI.
     */
    public void sendCustomEmail(String to, String subject, String body) {
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("Recipient email is required.");
        }
        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("Subject is required.");
        }
        emailProvider.sendHtmlEmail(to.trim(), subject.trim(), wrapHtml(body == null ? "" : body),
                replyToEmail.isBlank() ? null : replyToEmail);
    }

    /** Wraps an admin's plain-text body (newlines → &lt;br&gt;) in the branded shell. */
    private String wrapHtml(String bodyText) {
        String safeBody = esc(bodyText).replace("\r\n", "\n").replace("\n", "<br>");
        String brand = storeSettingsService.emailBrandHeaderHtml();
        return "<div style=\"background:#f4f4f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif\">"
                + "<div style=\"max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden\">"
                + "<div style=\"padding:20px 28px;border-bottom:1px solid #eeeeee\">" + brand + "</div>"
                + "<div style=\"padding:26px 28px;color:#374151;font-size:15px;line-height:1.75\">" + safeBody + "</div>"
                + "<div style=\"padding:16px 28px;border-top:1px solid #eeeeee;color:#9ca3af;font-size:12px\">"
                + esc(storeName) + "</div>"
                + "</div></div>";
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    public void sendOtp(String to, String otp) {
        emailProvider.sendEmail(
                to,
                "Your OTP Code",
                "Your verification code is: " + otp
        );
    }

    public void sendTemplate(
            String to,
            String templateCode,
            Map<String, String> variables
    ) {
        sendTemplate(to, templateCode, null, variables);
    }

    /** Same, but resolves the template in {@code lang} (falling back to the default). */
    public void sendTemplate(
            String to,
            String templateCode,
            String lang,
            Map<String, String> variables
    ) {

        EmailTemplate template =
                lang == null ? templateService.getByCode(templateCode)
                             : templateService.getByCode(templateCode, lang);

        // Inject the shared brand header (logo or wordmark) so every template's
        // {{brandHeader}} resolves without each caller having to provide it. Caller
        // values win, and the incoming map may be immutable (Map.of), so copy first.
        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("brandHeader", storeSettingsService.emailBrandHeaderHtml());
        if (variables != null) {
            vars.putAll(variables);
        }

        String subject =
                TemplateEngine.process(
                        template.getSubject(),
                        vars
                );

        String body =
                TemplateEngine.process(
                        template.getBody(),
                        vars
                );

        // Template bodies are HTML (seeded from DefaultEmailTemplates), so send as
        // HTML — otherwise the raw markup shows in the recipient's inbox.
        emailProvider.sendHtmlEmail(
                to,
                subject,
                body
        );
    }
}