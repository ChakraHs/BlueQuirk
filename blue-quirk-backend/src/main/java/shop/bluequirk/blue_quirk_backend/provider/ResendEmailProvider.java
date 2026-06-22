package shop.bluequirk.blue_quirk_backend.provider;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

/**
 * Sends mail through the Resend HTTP API (https://resend.com).
 * Active when {@code email.provider=resend}. Requires {@code resend.api-key}
 * (supplied via the RESEND_API_KEY env var) and a {@code resend.from} address.
 *
 * <p>Until a domain is verified in Resend, the only valid {@code from} is
 * {@code onboarding@resend.dev} and mail can only be delivered to the Resend
 * account owner's own email address.
 */
@Primary
@Service
@ConditionalOnProperty(name = "email.provider", havingValue = "resend")
public class ResendEmailProvider implements EmailProvider {

    private static final Logger LOG = LoggerFactory.getLogger(ResendEmailProvider.class);
    private static final String ENDPOINT = "https://api.resend.com/emails";

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final String apiKey;
    private final String from;

    public ResendEmailProvider(
            @Value("${resend.api-key:}") String apiKey,
            @Value("${resend.from:}") String from) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.from = from == null ? "" : from.trim();
        if (this.apiKey.isBlank()) {
            LOG.warn("email.provider=resend but resend.api-key (RESEND_API_KEY) is not set — emails will fail.");
        }
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
        if (apiKey.isBlank()) {
            throw new IllegalStateException("Resend API key not configured (RESEND_API_KEY)");
        }

        String field = html ? "html" : "text";
        String payload = "{"
                + "\"from\":\"" + jsonEscape(from) + "\","
                + "\"to\":[\"" + jsonEscape(to) + "\"],"
                + "\"subject\":\"" + jsonEscape(subject) + "\","
                + "\"" + field + "\":\"" + jsonEscape(body) + "\""
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(ENDPOINT))
                .timeout(Duration.ofSeconds(20))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status < 200 || status >= 300) {
                throw new RuntimeException("Resend API returned " + status + ": " + response.body());
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Resend email sending failed", e);
        }
    }

    private static String jsonEscape(String s) {
        if (s == null) return "";
        StringBuilder out = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        return out.toString();
    }
}
