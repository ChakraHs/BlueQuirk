package shop.bluequirk.blue_quirk_backend.service;

import java.util.Map;

import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.entity.EmailTemplate;
import shop.bluequirk.blue_quirk_backend.provider.EmailProvider;
import shop.bluequirk.blue_quirk_backend.utility.TemplateEngine;

@Service
public class EmailService {

    private final EmailProvider emailProvider;
    private final EmailTemplateService templateService;


    public EmailService(
    		EmailProvider emailProvider,
    		 EmailTemplateService templateService
    		) {
        this.emailProvider = emailProvider;
        this.templateService = templateService;
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

        String subject =
                TemplateEngine.process(
                        template.getSubject(),
                        variables
                );

        String body =
                TemplateEngine.process(
                        template.getBody(),
                        variables
                );

        emailProvider.sendEmail(
                to,
                subject,
                body
        );
    }
}