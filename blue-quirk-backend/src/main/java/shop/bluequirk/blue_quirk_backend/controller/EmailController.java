package shop.bluequirk.blue_quirk_backend.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.dto.SendEmailRequest;
import shop.bluequirk.blue_quirk_backend.service.EmailService;

@RestController
@RequestMapping("/api/email")
public class EmailController {

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
}