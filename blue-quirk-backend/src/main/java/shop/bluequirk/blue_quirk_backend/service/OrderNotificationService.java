package shop.bluequirk.blue_quirk_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.dto.OrderResponse;
import shop.bluequirk.blue_quirk_backend.provider.EmailProvider;

/**
 * Sends order-confirmation emails (customer + admin) after an order is placed.
 * Runs asynchronously and best-effort: a mail failure is logged but never breaks
 * order placement, and each recipient is sent independently.
 */
@Service
public class OrderNotificationService {

    private static final Logger LOG = LoggerFactory.getLogger(OrderNotificationService.class);

    private final EmailProvider emailProvider;
    private final String adminEmail;
    private final String currency;

    public OrderNotificationService(
            EmailProvider emailProvider,
            @Value("${order.admin-email:}") String adminEmail,
            @Value("${order.currency:$}") String currency) {
        this.emailProvider = emailProvider;
        this.adminEmail = adminEmail == null ? "" : adminEmail.trim();
        this.currency = currency;
    }

    @Async
    public void sendOrderEmails(OrderResponse order) {
        // Customer confirmation
        if (order.email() != null && !order.email().isBlank()) {
            trySend(order.email(),
                    "Votre commande BlueQuirk #" + order.id() + " est confirmée",
                    customerHtml(order));
        }
        // Admin notification
        if (!adminEmail.isBlank()) {
            trySend(adminEmail,
                    "Nouvelle commande #" + order.id() + " — " + money(order.total()),
                    adminHtml(order));
        }
    }

    private void trySend(String to, String subject, String html) {
        try {
            emailProvider.sendHtmlEmail(to, subject, html);
            LOG.info("Order email sent to {}", to);
        } catch (Exception e) {
            LOG.warn("Failed to send order email to {}: {}", to, e.getMessage());
        }
    }

    private String money(double v) {
        return String.format("%.2f %s", v, currency);
    }

    private String itemsTable(OrderResponse order) {
        StringBuilder rows = new StringBuilder();
        for (OrderResponse.Item it : order.items()) {
            String variant = (it.variant() != null && !it.variant().isBlank())
                    ? "<div style='color:#6b7280;font-size:12px'>" + esc(it.variant()) + "</div>" : "";
            rows.append("<tr>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #eee'>")
                .append("<strong>").append(esc(it.name())).append("</strong>").append(variant)
                .append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #eee;text-align:center'>")
                .append(it.quantity()).append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #eee;text-align:right'>")
                .append(money(it.lineTotal())).append("</td>")
                .append("</tr>");
        }
        return "<table style='width:100%;border-collapse:collapse;font-size:14px'>"
                + "<thead><tr>"
                + "<th style='text-align:left;padding:8px;color:#6b7280;font-weight:600'>Article</th>"
                + "<th style='text-align:center;padding:8px;color:#6b7280;font-weight:600'>Qté</th>"
                + "<th style='text-align:right;padding:8px;color:#6b7280;font-weight:600'>Total</th>"
                + "</tr></thead><tbody>" + rows + "</tbody></table>";
    }

    private String totals(OrderResponse order) {
        return "<table style='width:100%;font-size:14px;margin-top:12px'>"
                + row("Sous-total", money(order.subtotal()), false)
                + row("Livraison", order.shippingFee() == 0 ? "Gratuite" : money(order.shippingFee()), false)
                + row("Total (à payer à la livraison)", money(order.total()), true)
                + "</table>";
    }

    private String row(String label, String value, boolean bold) {
        String w = bold ? "700" : "400";
        String size = bold ? "16px" : "14px";
        return "<tr><td style='padding:4px 0;font-weight:" + w + ";font-size:" + size + "'>" + esc(label) + "</td>"
                + "<td style='padding:4px 0;text-align:right;font-weight:" + w + ";font-size:" + size + "'>" + value + "</td></tr>";
    }

    private String shipping(OrderResponse o) {
        String note = (o.note() != null && !o.note().isBlank())
                ? "<p style='margin:6px 0;color:#374151'><strong>Note:</strong> " + esc(o.note()) + "</p>" : "";
        return "<div style='background:#f9fafb;border-radius:10px;padding:16px;margin-top:16px'>"
                + "<p style='margin:0 0 6px;font-weight:600'>Livraison</p>"
                + "<p style='margin:2px 0;color:#374151'>" + esc(o.customerName()) + " — " + esc(o.phone()) + "</p>"
                + "<p style='margin:2px 0;color:#374151'>" + esc(o.address()) + ", " + esc(o.city()) + "</p>"
                + note + "</div>";
    }

    private String wrap(String title, String intro, String inner) {
        return "<div style='font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111827'>"
                + "<div style='font-size:22px;font-weight:800;padding:8px 0'>Blue<span style='color:#2563eb'>Quirk</span></div>"
                + "<h2 style='font-size:20px;margin:8px 0'>" + esc(title) + "</h2>"
                + "<p style='color:#374151'>" + intro + "</p>"
                + "<div style='display:inline-block;background:#eff6ff;color:#1d4ed8;border-radius:999px;"
                + "padding:6px 12px;font-size:13px;font-weight:600;margin:6px 0'>Paiement à la livraison (Cash on Delivery)</div>"
                + inner
                + "<p style='color:#9ca3af;font-size:12px;margin-top:24px'>BlueQuirk — merci pour votre confiance.</p>"
                + "</div>";
    }

    private String customerHtml(OrderResponse o) {
        String intro = "Bonjour " + esc(o.customerName()) + ", votre commande <strong>#" + o.id()
                + "</strong> a bien été enregistrée. Nous vous appellerons pour confirmer la livraison. "
                + "Vous payez en espèces à la réception.";
        return wrap("Commande confirmée", intro, itemsTable(o) + totals(o) + shipping(o));
    }

    private String adminHtml(OrderResponse o) {
        String intro = "Nouvelle commande <strong>#" + o.id() + "</strong> passée par "
                + esc(o.customerName()) + " (" + esc(o.email() != null ? o.email() : "—") + ").";
        return wrap("Nouvelle commande #" + o.id(), intro, shipping(o) + itemsTable(o) + totals(o));
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
