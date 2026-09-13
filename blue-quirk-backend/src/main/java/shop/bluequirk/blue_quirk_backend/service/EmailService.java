package shop.bluequirk.blue_quirk_backend.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.entity.EmailTemplate;
import shop.bluequirk.blue_quirk_backend.provider.EmailProvider;
import shop.bluequirk.blue_quirk_backend.utility.TemplateEngine;

@Service
public class EmailService {

    private final EmailProvider emailProvider;
    private final EmailTemplateService templateService;
    private final StoreSettingsService storeSettingsService;


    public EmailService(
    		EmailProvider emailProvider,
    		 EmailTemplateService templateService,
    		 StoreSettingsService storeSettingsService
    		) {
        this.emailProvider = emailProvider;
        this.templateService = templateService;
        this.storeSettingsService = storeSettingsService;
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