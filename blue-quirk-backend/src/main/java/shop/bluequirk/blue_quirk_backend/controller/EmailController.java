package shop.bluequirk.blue_quirk_backend.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.dto.CustomEmailRequest;
import shop.bluequirk.blue_quirk_backend.dto.SendEmailRequest;
import shop.bluequirk.blue_quirk_backend.service.EmailService;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    private static final Logger LOG = LoggerFactory.getLogger(EmailController.class);

    private final EmailService emailService;

    public EmailController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/otp")
    public void sendOtp(@RequestParam String email) {
        String otp = String.valueOf((int)(Math.random() * 900000) + 100000);
        emailService.sendOtp(email, otp);
    }


    @PostMapping("/send")
    public void send(@RequestBody SendEmailRequest request) {

        emailService.sendTemplate(
                request.getTo(),
                request.getTemplateCode(),
                request.getVariables()
        );
    }

    /**
     * Admin-only: send a one-off custom email (free subject + body) to a customer.
     * Body is wrapped in the branded shell and Reply-To points at the admin inbox.
     * Admin-gated by SecurityConfig's fail-closed default (anyRequest → "admin").
     */
    @PostMapping("/custom")
    public Map<String, Object> sendCustom(@RequestBody CustomEmailRequest request) {
        emailService.sendCustomEmail(request.to(), request.subject(), request.body());
        LOG.info("Custom email sent to {} (subject: {}, order: {})",
                request.to(), request.subject(), request.orderId());
        return Map.of("sent", true, "to", request.to());
    }
}