package shop.bluequirk.blue_quirk_backend.dto;

/**
 * Admin-composed one-off email: a free subject + body sent to a customer.
 * {@code orderId} is optional context (for logging/UI), not required to send.
 */
public record CustomEmailRequest(String to, String subject, String body, Long orderId) {}
