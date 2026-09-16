package shop.bluequirk.blue_quirk_backend.provider;

public interface EmailProvider {
    void sendEmail(String to, String subject, String body);

    /** Send an HTML email. Defaults to plain text for providers that don't override. */
    default void sendHtmlEmail(String to, String subject, String html) {
        sendEmail(to, subject, html);
    }

    /**
     * Send an HTML email with a {@code Reply-To} address, so a customer's reply
     * lands in a monitored inbox rather than the unattended {@code from} sender.
     * Providers that can't set headers fall back to a plain HTML send.
     */
    default void sendHtmlEmail(String to, String subject, String html, String replyTo) {
        sendHtmlEmail(to, subject, html);
    }
}
