package shop.bluequirk.blue_quirk_backend.provider;

import java.util.Properties;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.entity.EmailConfig;
import shop.bluequirk.blue_quirk_backend.service.EmailConfigService;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

@Primary
@Service
public class SmtpEmailProvider implements EmailProvider {

    private final EmailConfigService configService;

    public SmtpEmailProvider(EmailConfigService configService) {
        this.configService = configService;
    }

    @Override
    public void sendEmail(String to, String subject, String body) {
        send(to, subject, body, false);
    }

    @Override
    public void sendHtmlEmail(String to, String subject, String html) {
        send(to, subject, html, true);
    }

    private void send(String to, String subject, String body, boolean html) {

        EmailConfig config = configService.getActiveConfig();

        Properties props = new Properties();
        props.put("mail.smtp.auth", String.valueOf(config.isSmtpAuth()));
        props.put("mail.smtp.starttls.enable", String.valueOf(config.isStarttls()));
        props.put("mail.smtp.host", config.getHost());
        props.put("mail.smtp.port", config.getPort());

        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(
                        config.getUsername(),
                        config.getPassword()
                );
            }
        });

        try {
            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(config.getUsername()));
            message.setRecipients(
                    Message.RecipientType.TO,
                    InternetAddress.parse(to)
            );
            message.setSubject(subject, "UTF-8");
            if (html) {
                message.setContent(body, "text/html; charset=UTF-8");
            } else {
                message.setText(body, "UTF-8");
            }

            Transport.send(message);

        } catch (Exception e) {
            throw new RuntimeException("Email sending failed", e);
        }
    }
}
