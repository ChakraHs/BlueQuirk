package shop.bluequirk.blue_quirk_backend.provider;

public interface EmailProvider {
    void sendEmail(String to, String subject, String body);
}
