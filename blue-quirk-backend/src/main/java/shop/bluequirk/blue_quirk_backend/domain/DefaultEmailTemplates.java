package shop.bluequirk.blue_quirk_backend.domain;

/**
 * Default, editable content for each {@link EmailEvent}. These are seeded into
 * the email_template table on startup (when missing) so the admin can edit real
 * emails right away. Bodies are full HTML using {@code {{variable}}} placeholders
 * (see {@link EmailTemplateCatalog}); the pre-rendered fragments
 * ({@code itemsTable}, {@code orderSummary}, {@code shippingBlock},
 * {@code trackButton}) let templates stay simple while keeping rich content.
 */
public final class DefaultEmailTemplates {

    private DefaultEmailTemplates() {}

    public record Seed(String subject, String body) {}

    public static Seed forEvent(EmailEvent event) {
        return switch (event) {
            case ORDER_PLACED_CUSTOMER -> customer(
                    "Your {{storeName}} order {{orderRef}} is confirmed",
                    "Order received",
                    "Hi {{customerName}}, your order <strong>{{orderRef}}</strong> has been registered. "
                    + "Keep this reference to track it. We'll call you to confirm delivery — "
                    + "you pay in cash on delivery.");
            case ORDER_PROCESSING -> customer(
                    "Your {{storeName}} order {{orderRef}} is being prepared",
                    "Order in preparation",
                    "Your order <strong>{{orderRef}}</strong> is being prepared in our workshop.");
            case ORDER_PACKED -> customer(
                    "Your {{storeName}} order {{orderRef}} is ready to ship",
                    "Order ready",
                    "Your order <strong>{{orderRef}}</strong> is packed and ready to hand to the carrier.");
            case ORDER_SHIPPED -> customer(
                    "Your {{storeName}} order {{orderRef}} has shipped",
                    "Order shipped",
                    "Your order <strong>{{orderRef}}</strong> is on its way. Our courier will contact you "
                    + "at {{phone}} for delivery. {{trackingLine}}");
            case ORDER_DELIVERED -> customer(
                    "Your {{storeName}} order {{orderRef}} has been delivered",
                    "Order delivered",
                    "Your order <strong>{{orderRef}}</strong> has been delivered. Thank you for choosing "
                    + "{{storeName}} — see you soon!");
            case ORDER_CANCELLED -> customer(
                    "Your {{storeName}} order {{orderRef}} has been cancelled",
                    "Order cancelled",
                    "Your order <strong>{{orderRef}}</strong> has been cancelled. {{cancellationLine}} "
                    + "For any question, simply reply to this email.");
            case ORDER_PLACED_ADMIN -> admin(
                    "New order {{orderRef}} — {{total}}",
                    "New order {{orderRef}}",
                    "New order <strong>{{orderRef}}</strong> placed by {{customerName}} ({{customerEmail}}).");
        };
    }

    /** Customer-facing layout: header, title, intro, COD badge, tracking + order details. */
    private static Seed customer(String subject, String title, String intro) {
        String body = wrapperOpen()
                + heading(title)
                + "<p style='color:#374151'>" + intro + "</p>"
                + codBadge()
                + "{{trackButton}}"
                + "{{itemsTable}}"
                + "{{orderSummary}}"
                + "{{shippingBlock}}"
                + footer()
                + wrapperClose();
        return new Seed(subject, body);
    }

    /** Admin-facing layout: shipping block first, no COD badge / tracking button. */
    private static Seed admin(String subject, String title, String intro) {
        String body = wrapperOpen()
                + heading(title)
                + "<p style='color:#374151'>" + intro + "</p>"
                + "{{shippingBlock}}"
                + "{{itemsTable}}"
                + "{{orderSummary}}"
                + footer()
                + wrapperClose();
        return new Seed(subject, body);
    }

    private static String wrapperOpen() {
        return "<div style='font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111827'>"
                + "<div style='font-size:22px;font-weight:800;padding:8px 0'>"
                + "Red<span style='color:#2563eb'>Quirk</span></div>";
    }

    private static String heading(String title) {
        return "<h2 style='font-size:20px;margin:8px 0'>" + title + "</h2>";
    }

    private static String codBadge() {
        return "<div style='display:inline-block;background:#eff6ff;color:#1d4ed8;border-radius:999px;"
                + "padding:6px 12px;font-size:13px;font-weight:600;margin:6px 0'>Cash on delivery</div>";
    }

    private static String footer() {
        return "<p style='color:#9ca3af;font-size:12px;margin-top:24px'>"
                + "{{storeName}} — thank you for your trust.</p>";
    }

    private static String wrapperClose() {
        return "</div>";
    }
}
