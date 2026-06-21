package shop.bluequirk.blue_quirk_backend.provider;

public interface EmailProvider {
    void sendEmail(String to, String subject, String body);

    /** Send an HTML email. Defaults to plain text for providers that don't override. */
    default void sendHtmlEmail(String to, String subject, String html) {
        sendEmail(to, subject, html);
    }
}
