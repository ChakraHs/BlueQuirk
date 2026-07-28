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
            case ORDER_DELIVERED -> new Seed(
                    "Votre commande {{orderRef}} a bien été livrée",
                    delivered());
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

    /**
     * Premium "order delivered" email — a warm, final closing message rather than
     * a status notification. No COD badge, tracking button, or "amount to pay"
     * (the order is delivered and paid): a delivery-confirmation hero, a thank-you,
     * a clean item recap, the paid total, and a friendly support/feedback block.
     */
    private static String delivered() {
        return "<div style='background:#f3f4f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif'>"
                + "<div style='max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;"
                + "border:1px solid #ececf0;overflow:hidden'>"
                // Brand bar
                + "<div style='padding:22px 28px;border-bottom:1px solid #f1f2f4;font-size:22px;"
                + "font-weight:800;color:#111827'>Red<span style='color:#dc2626'>Quirk</span></div>"
                // Hero
                + "<div style='padding:36px 28px 4px;text-align:center'>"
                + "<div style='width:66px;height:66px;margin:0 auto 18px;border-radius:50%;background:#ecfdf5'>"
                + "<span style='font-size:34px;line-height:66px;color:#059669'>&#10003;</span></div>"
                + "<h1 style='margin:0;font-size:23px;color:#111827'>Votre commande est arrivée</h1>"
                + "<p style='margin:10px 0 0;color:#6b7280;font-size:15px'>La commande "
                + "<strong style='color:#111827'>{{orderRef}}</strong> a été livrée avec succès.</p></div>"
                // Body
                + "<div style='padding:22px 28px 4px'>"
                + "<p style='margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65'>"
                + "Bonjour {{customerName}}, merci d'avoir choisi {{storeName}}. Nous espérons que votre "
                + "commande vous plaît et nous vous remercions de votre confiance.</p>"
                + "<p style='margin:0 0 8px;color:#111827;font-size:13px;font-weight:700;"
                + "text-transform:uppercase;letter-spacing:.04em'>Votre commande</p>"
                + "{{itemsTable}}"
                + "<div style='text-align:right;margin-top:12px;color:#111827;font-size:15px'>"
                + "Total payé&nbsp;: <strong>{{total}}</strong></div>"
                + "<div style='background:#f9fafb;border:1px solid #f0f1f3;border-radius:12px;"
                + "padding:16px 18px;margin:24px 0 6px'>"
                + "<p style='margin:0 0 4px;color:#111827;font-weight:700;font-size:14px'>"
                + "Une question sur votre commande&nbsp;?</p>"
                + "<p style='margin:0;color:#6b7280;font-size:13px;line-height:1.6'>"
                + "Répondez simplement à cet e-mail — notre équipe vous répond rapidement. "
                + "Votre avis compte énormément pour nous.</p></div></div>"
                // Footer
                + "<div style='padding:18px 28px 26px;border-top:1px solid #f1f2f4;text-align:center'>"
                + "<p style='margin:0;color:#9ca3af;font-size:12px'>{{storeName}} — merci pour votre confiance.</p>"
                + "</div></div></div>";
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
                + "Red<span style='color:#dc2626'>Quirk</span></div>";
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
