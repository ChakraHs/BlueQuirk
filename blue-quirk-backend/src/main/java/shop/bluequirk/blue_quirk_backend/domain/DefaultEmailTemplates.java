package shop.bluequirk.blue_quirk_backend.domain;

import shop.bluequirk.blue_quirk_backend.utility.EmailI18n;

/**
 * Default, editable content for each {@link EmailEvent}, in each supported
 * language ({@code fr} default, {@code ar}). These are seeded into the
 * email_template table on startup (one row per code+lang, when missing) so the
 * admin can edit real emails right away. Bodies are full HTML using
 * {@code {{variable}}} placeholders (see {@link EmailTemplateCatalog}); the
 * pre-rendered fragments ({@code itemsTable}, {@code orderSummary},
 * {@code shippingBlock}, {@code trackButton}) are built in the recipient's
 * language by OrderNotificationService, so templates stay simple.
 *
 * <p>The built-in content here also serves as the send-time fallback: when no
 * active DB template exists for an event+language, OrderNotificationService
 * renders these seeds directly — so the two never drift.
 */
public final class DefaultEmailTemplates {

    private DefaultEmailTemplates() {}

    public record Seed(String subject, String body) {}

    /** Localized default for an event. {@code lang} is normalized (fr/ar, default fr). */
    public static Seed forEvent(EmailEvent event, String lang) {
        String l = EmailI18n.normalize(lang);
        boolean ar = "ar".equals(l);
        return switch (event) {
            case ORDER_PLACED_CUSTOMER -> customer(l,
                    ar ? "تم تأكيد طلبك {{orderRef}} لدى {{storeName}}"
                       : "Votre commande {{storeName}} {{orderRef}} est confirmée",
                    ar ? "تم تأكيد طلبك" : "Commande confirmée",
                    ar ? "مرحبًا {{customerName}}، تم تسجيل طلبك <strong>{{orderRef}}</strong>. "
                         + "احتفظ بهذا المرجع لتتبّع طلبك. سنتصل بك لتأكيد التسليم — "
                         + "الدفع نقدًا عند الاستلام."
                       : "Bonjour {{customerName}}, votre commande <strong>{{orderRef}}</strong> a bien été "
                         + "enregistrée. Conservez cette référence pour la suivre. Nous vous appellerons pour "
                         + "confirmer la livraison — vous payez en espèces à la réception.");
            case ORDER_PROCESSING -> customer(l,
                    ar ? "طلبك {{orderRef}} قيد التحضير"
                       : "Votre commande {{storeName}} {{orderRef}} est en préparation",
                    ar ? "الطلب قيد التحضير" : "Commande en préparation",
                    ar ? "طلبك <strong>{{orderRef}}</strong> قيد التحضير في ورشتنا."
                       : "Votre commande <strong>{{orderRef}}</strong> est en cours de préparation dans nos ateliers.");
            case ORDER_PACKED -> customer(l,
                    ar ? "طلبك {{orderRef}} جاهز للشحن"
                       : "Votre commande {{storeName}} {{orderRef}} est prête à l'expédition",
                    ar ? "الطلب جاهز" : "Commande prête",
                    ar ? "طلبك <strong>{{orderRef}}</strong> تم تغليفه وهو جاهز لتسليمه إلى شركة الشحن."
                       : "Votre commande <strong>{{orderRef}}</strong> est emballée et prête à être remise au transporteur.");
            case ORDER_SHIPPED -> customer(l,
                    ar ? "تم شحن طلبك {{orderRef}}"
                       : "Votre commande {{storeName}} {{orderRef}} a été expédiée",
                    ar ? "تم شحن الطلب" : "Commande expédiée",
                    ar ? "طلبك <strong>{{orderRef}}</strong> في الطريق إليك. سيتصل بك مندوب التوصيل على "
                         + "{{phone}} لإتمام التسليم. {{trackingLine}}"
                       : "Votre commande <strong>{{orderRef}}</strong> est en route. Notre livreur vous "
                         + "contactera au {{phone}} pour la livraison. {{trackingLine}}");
            case ORDER_DELIVERED -> new Seed(
                    ar ? "تم تسليم طلبك {{orderRef}} بنجاح"
                       : "Votre commande {{orderRef}} a bien été livrée",
                    delivered(l));
            case ORDER_CANCELLED -> customer(l,
                    ar ? "تم إلغاء طلبك {{orderRef}}"
                       : "Votre commande {{storeName}} {{orderRef}} a été annulée",
                    ar ? "تم إلغاء الطلب" : "Commande annulée",
                    ar ? "تم إلغاء طلبك <strong>{{orderRef}}</strong>. {{cancellationLine}} "
                         + "لأي استفسار، يكفي الرد على هذا البريد الإلكتروني."
                       : "Votre commande <strong>{{orderRef}}</strong> a été annulée. {{cancellationLine}} "
                         + "Pour toute question, répondez simplement à cet e-mail.");
            case ORDER_PLACED_ADMIN -> admin(l,
                    ar ? "طلب جديد {{orderRef}} — {{total}}"
                       : "Nouvelle commande {{orderRef}} — {{total}}",
                    ar ? "طلب جديد {{orderRef}}" : "Nouvelle commande {{orderRef}}",
                    ar ? "طلب جديد <strong>{{orderRef}}</strong> من {{customerName}} ({{customerEmail}})."
                       : "Nouvelle commande <strong>{{orderRef}}</strong> passée par {{customerName}} ({{customerEmail}}).");
        };
    }

    /**
     * Premium "order delivered" email — a warm, final closing message rather than
     * a status notification. No COD badge, tracking button, or "amount to pay"
     * (the order is delivered and paid): a delivery-confirmation hero, a thank-you,
     * a clean item recap, the paid total, and a friendly support/feedback block.
     */
    private static String delivered(String lang) {
        boolean ar = "ar".equals(lang);
        String dir = EmailI18n.dir(lang);
        String start = EmailI18n.startAlign(lang);
        String end = EmailI18n.endAlign(lang);
        String heroTitle = ar ? "وصل طلبك" : "Votre commande est arrivée";
        String heroSub = ar
                ? "تم تسليم الطلب <strong style='color:#111827'>{{orderRef}}</strong> بنجاح."
                : "La commande <strong style='color:#111827'>{{orderRef}}</strong> a été livrée avec succès.";
        String thanks = ar
                ? "مرحبًا {{customerName}}، شكرًا لاختيارك {{storeName}}. نتمنى أن ينال طلبك إعجابك، "
                  + "ونشكرك على ثقتك بنا."
                : "Bonjour {{customerName}}, merci d'avoir choisi {{storeName}}. Nous espérons que votre "
                  + "commande vous plaît et nous vous remercions de votre confiance.";
        String orderLabel = ar ? "طلبك" : "Votre commande";
        String totalLabel = EmailI18n.t(lang, "summary.totalPaid");
        String supportTitle = ar ? "لديك سؤال حول طلبك؟" : "Une question sur votre commande&nbsp;?";
        String supportBody = ar
                ? "يكفي الرد على هذا البريد الإلكتروني — سيرد عليك فريقنا بسرعة. رأيك يهمّنا كثيرًا."
                : "Répondez simplement à cet e-mail — notre équipe vous répond rapidement. "
                  + "Votre avis compte énormément pour nous.";
        String footer = "{{storeName}} — " + EmailI18n.t(lang, "footer.thanks");

        return "<div dir='" + dir + "' style='background:#f3f4f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;text-align:" + start + "'>"
                + "<div style='max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;"
                + "border:1px solid #ececf0;overflow:hidden'>"
                // Brand bar
                + "<div style='padding:22px 28px;border-bottom:1px solid #f1f2f4;font-size:22px;"
                + "font-weight:800;color:#111827'>Red<span style='color:#dc2626'>Quirk</span></div>"
                // Hero
                + "<div style='padding:36px 28px 4px;text-align:center'>"
                + "<div style='width:66px;height:66px;margin:0 auto 18px;border-radius:50%;background:#ecfdf5'>"
                + "<span style='font-size:34px;line-height:66px;color:#059669'>&#10003;</span></div>"
                + "<h1 style='margin:0;font-size:23px;color:#111827'>" + heroTitle + "</h1>"
                + "<p style='margin:10px 0 0;color:#6b7280;font-size:15px'>" + heroSub + "</p></div>"
                // Body
                + "<div style='padding:22px 28px 4px'>"
                + "<p style='margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65'>" + thanks + "</p>"
                + "<p style='margin:0 0 8px;color:#111827;font-size:13px;font-weight:700;"
                + "text-transform:uppercase;letter-spacing:.04em'>" + orderLabel + "</p>"
                + "{{itemsTable}}"
                + "<div style='text-align:" + end + ";margin-top:12px;color:#111827;font-size:15px'>"
                + totalLabel + "&nbsp;: <strong>{{total}}</strong></div>"
                + "<div style='background:#f9fafb;border:1px solid #f0f1f3;border-radius:12px;"
                + "padding:16px 18px;margin:24px 0 6px'>"
                + "<p style='margin:0 0 4px;color:#111827;font-weight:700;font-size:14px'>" + supportTitle + "</p>"
                + "<p style='margin:0;color:#6b7280;font-size:13px;line-height:1.6'>" + supportBody + "</p></div></div>"
                // Footer
                + "<div style='padding:18px 28px 26px;border-top:1px solid #f1f2f4;text-align:center'>"
                + "<p style='margin:0;color:#9ca3af;font-size:12px'>" + footer + "</p>"
                + "</div></div></div>";
    }

    /** Customer-facing layout: header, title, intro, COD badge, tracking + order details. */
    private static Seed customer(String lang, String subject, String title, String intro) {
        String body = wrapperOpen(lang)
                + heading(title)
                + "<p style='color:#374151'>" + intro + "</p>"
                + codBadge(lang)
                + "{{trackButton}}"
                + "{{itemsTable}}"
                + "{{orderSummary}}"
                + "{{shippingBlock}}"
                + footer(lang)
                + wrapperClose();
        return new Seed(subject, body);
    }

    /** Admin-facing layout: shipping block first, no COD badge / tracking button. */
    private static Seed admin(String lang, String subject, String title, String intro) {
        String body = wrapperOpen(lang)
                + heading(title)
                + "<p style='color:#374151'>" + intro + "</p>"
                + "{{shippingBlock}}"
                + "{{itemsTable}}"
                + "{{orderSummary}}"
                + footer(lang)
                + wrapperClose();
        return new Seed(subject, body);
    }

    private static String wrapperOpen(String lang) {
        return "<div dir='" + EmailI18n.dir(lang) + "' style='font-family:Arial,Helvetica,sans-serif;"
                + "max-width:560px;margin:0 auto;color:#111827;text-align:" + EmailI18n.startAlign(lang) + "'>"
                + "<div style='font-size:22px;font-weight:800;padding:8px 0'>"
                + "Red<span style='color:#dc2626'>Quirk</span></div>";
    }

    private static String heading(String title) {
        return "<h2 style='font-size:20px;margin:8px 0'>" + title + "</h2>";
    }

    private static String codBadge(String lang) {
        return "<div style='display:inline-block;background:#eff6ff;color:#1d4ed8;border-radius:999px;"
                + "padding:6px 12px;font-size:13px;font-weight:600;margin:6px 0'>"
                + EmailI18n.t(lang, "cod.badge") + "</div>";
    }

    private static String footer(String lang) {
        return "<p style='color:#9ca3af;font-size:12px;margin-top:24px'>"
                + "{{storeName}} — " + EmailI18n.t(lang, "footer.thanks") + "</p>";
    }

    private static String wrapperClose() {
        return "</div>";
    }
}
