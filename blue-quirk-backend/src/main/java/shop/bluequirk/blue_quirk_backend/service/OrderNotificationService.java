package shop.bluequirk.blue_quirk_backend.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.domain.EmailEvent;
import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.dto.OrderResponse;
import shop.bluequirk.blue_quirk_backend.entity.EmailTemplate;
import shop.bluequirk.blue_quirk_backend.provider.EmailProvider;
import shop.bluequirk.blue_quirk_backend.repository.EmailTemplateRepository;
import shop.bluequirk.blue_quirk_backend.utility.TemplateEngine;

/**
 * Sends order-confirmation emails (customer + admin) after an order is placed.
 * Runs asynchronously and best-effort: a mail failure is logged but never breaks
 * order placement, and each recipient is sent independently.
 */
@Service
public class OrderNotificationService {

    private static final Logger LOG = LoggerFactory.getLogger(OrderNotificationService.class);

    private final EmailProvider emailProvider;
    private final EmailTemplateRepository templateRepository;
    private final String adminEmail;
    private final String currency;
    private final String storeName;
    private final String frontendBaseUrl;

    public OrderNotificationService(
            EmailProvider emailProvider,
            EmailTemplateRepository templateRepository,
            @Value("${order.admin-email:}") String adminEmail,
            @Value("${order.currency:$}") String currency,
            @Value("${app.store-name:RedQuirk}") String storeName,
            @Value("${app.frontend-base-url:http://localhost:3000}") String frontendBaseUrl) {
        this.emailProvider = emailProvider;
        this.templateRepository = templateRepository;
        this.adminEmail = adminEmail == null ? "" : adminEmail.trim();
        this.currency = currency;
        this.storeName = (storeName == null || storeName.isBlank()) ? "RedQuirk" : storeName.trim();
        this.frontendBaseUrl = (frontendBaseUrl == null ? "" : frontendBaseUrl.trim()).replaceAll("/+$", "");
    }

    @Async
    public void sendOrderEmails(OrderResponse order) {
        Map<String, String> vars = buildVars(order);
        // Customer confirmation
        if (order.email() != null && !order.email().isBlank()) {
            sendEvent(order.email(), EmailEvent.ORDER_PLACED_CUSTOMER, vars,
                    storeName + " order " + ref(order) + " confirmed",
                    customerHtml(order));
        }
        // Admin notification
        if (!adminEmail.isBlank()) {
            sendEvent(adminEmail, EmailEvent.ORDER_PLACED_ADMIN, vars,
                    "New order " + ref(order) + " — " + money(order.total()),
                    adminHtml(order));
        }
    }

    /** Public tracking URL for this order, or null when it has no order number. */
    private String trackUrl(OrderResponse order) {
        if (frontendBaseUrl.isBlank()
                || order.orderNumber() == null || order.orderNumber().isBlank()) {
            return null;
        }
        return frontendBaseUrl + "/order-tracking?order="
                + URLEncoder.encode(order.orderNumber(), StandardCharsets.UTF_8);
    }

    /** A "Suivre ma commande" CTA button, or "" when there is no tracking URL. */
    private String trackButton(OrderResponse order) {
        String url = trackUrl(order);
        if (url == null) return "";
        return "<div style='margin:18px 0'>"
                + "<a href='" + url + "' "
                + "style='display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;"
                + "font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px'>"
                + "Suivre ma commande</a>"
                + "<p style='margin:8px 0 0;color:#6b7280;font-size:12px'>"
                + "Référence : <strong>" + esc(ref(order)) + "</strong></p>"
                + "</div>";
    }

    /** Customer-facing reference: the order number (BQ-…) when set, else "#id". */
    private String ref(OrderResponse order) {
        return order.orderNumber() != null && !order.orderNumber().isBlank()
                ? order.orderNumber() : "#" + order.id();
    }

    /**
     * Emails the customer when an admin changes the order's status. Best-effort,
     * async, and skipped when there is no customer email.
     */
    @Async
    public void sendStatusUpdate(OrderResponse order, OrderStatus status) {
        if (order.email() == null || order.email().isBlank()) {
            return;
        }
        EmailEvent event = EmailEvent.forStatus(status);
        if (event == null) {
            return; // no email for this status (e.g. PENDING)
        }
        sendEvent(order.email(), event, buildVars(order),
                statusSubject(order, status), statusHtml(order, status));
    }

    /**
     * Sends an event email using the active {@link EmailTemplate} whose code
     * matches the event, rendering {@code {{variables}}}. Falls back to the
     * built-in subject/HTML when no active template is assigned. Best-effort.
     */
    private void sendEvent(String to, EmailEvent event, Map<String, String> vars,
                           String fallbackSubject, String fallbackHtml) {
        String subject = fallbackSubject;
        String html = fallbackHtml;
        Optional<EmailTemplate> template = templateRepository.findByCodeAndActiveTrue(event.code());
        if (template.isPresent()) {
            subject = TemplateEngine.process(template.get().getSubject(), vars);
            html = TemplateEngine.process(template.get().getBody(), vars);
        }
        trySend(to, subject, html);
    }

    /** All template variables for an order (see EmailTemplateCatalog). */
    private Map<String, String> buildVars(OrderResponse o) {
        Map<String, String> v = new LinkedHashMap<>();
        v.put("storeName", storeName);
        v.put("orderRef", ref(o));
        v.put("customerName", esc(o.customerName()));
        v.put("customerEmail", esc(o.email() != null ? o.email() : ""));
        v.put("phone", esc(o.phone()));
        v.put("address", esc(o.address()));
        v.put("city", esc(o.city()));
        v.put("subtotal", money(o.subtotal()));
        v.put("shipping", o.shippingFee() == 0 ? "Free" : money(o.shippingFee()));
        v.put("total", money(o.total()));

        String tracking = o.trackingNumber() != null ? o.trackingNumber().trim() : "";
        v.put("trackingNumber", esc(tracking));
        v.put("trackingLine", tracking.isBlank() ? ""
                : "Tracking number: <strong>" + esc(tracking) + "</strong>.");

        String reason = o.cancellationReason() != null ? o.cancellationReason().trim() : "";
        v.put("cancellationReason", esc(reason));
        v.put("cancellationLine", reason.isBlank() ? ""
                : "Reason: <strong>" + esc(reason) + "</strong>.");

        v.put("estimatedDelivery", esc(o.estimatedDelivery() != null ? o.estimatedDelivery() : ""));
        String url = trackUrl(o);
        v.put("trackUrl", url != null ? url : "");
        v.put("trackButton", trackButton(o));
        v.put("itemsTable", itemsTable(o));
        v.put("orderSummary", totals(o));
        v.put("shippingBlock", shipping(o));
        return v;
    }

    private String statusSubject(OrderResponse order, OrderStatus status) {
        String ref = ref(order);
        return switch (status) {
            case PROCESSING -> "Votre commande RedQuirk " + ref + " est en préparation";
            case PACKED     -> "Votre commande RedQuirk " + ref + " est prête à l'expédition";
            case SHIPPED    -> "Votre commande RedQuirk " + ref + " a été expédiée";
            case DELIVERED  -> "Votre commande RedQuirk " + ref + " a été livrée";
            case CANCELLED  -> "Votre commande RedQuirk " + ref + " a été annulée";
            default         -> "Mise à jour de votre commande RedQuirk " + ref;
        };
    }

    private String statusHtml(OrderResponse order, OrderStatus status) {
        String ref = ref(order);
        String title;
        String intro;
        switch (status) {
            case PROCESSING -> {
                title = "Commande en préparation";
                intro = "Votre commande <strong>" + ref + "</strong> est en cours de préparation dans nos ateliers.";
            }
            case PACKED -> {
                title = "Commande prête";
                intro = "Votre commande <strong>" + ref + "</strong> est emballée et prête à être remise au transporteur.";
            }
            case SHIPPED -> {
                title = "Commande expédiée";
                String tracking = (order.trackingNumber() != null && !order.trackingNumber().isBlank())
                        ? " Numéro de suivi : <strong>" + esc(order.trackingNumber()) + "</strong>." : "";
                intro = "Votre commande <strong>" + ref + "</strong> est en route. "
                        + "Notre livreur vous contactera au " + esc(order.phone()) + " pour la livraison." + tracking;
            }
            case DELIVERED -> {
                title = "Commande livrée";
                intro = "Votre commande <strong>" + ref + "</strong> a bien été livrée. "
                        + "Merci d'avoir choisi RedQuirk — à très bientôt !";
            }
            case CANCELLED -> {
                title = "Commande annulée";
                String reason = (order.cancellationReason() != null && !order.cancellationReason().isBlank())
                        ? " Motif : <strong>" + esc(order.cancellationReason()) + "</strong>." : "";
                intro = "Votre commande <strong>" + ref + "</strong> a été annulée." + reason
                        + " Pour toute question, répondez simplement à cet e-mail.";
            }
            default -> {
                title = "Mise à jour de commande";
                intro = "Le statut de votre commande <strong>" + ref + "</strong> a été mis à jour.";
            }
        }
        return wrap(title, intro, trackButton(order) + itemsTable(order) + totals(order) + shipping(order));
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
                + "<div style='font-size:22px;font-weight:800;padding:8px 0'>Red<span style='color:#2563eb'>Quirk</span></div>"
                + "<h2 style='font-size:20px;margin:8px 0'>" + esc(title) + "</h2>"
                + "<p style='color:#374151'>" + intro + "</p>"
                + "<div style='display:inline-block;background:#eff6ff;color:#1d4ed8;border-radius:999px;"
                + "padding:6px 12px;font-size:13px;font-weight:600;margin:6px 0'>Paiement à la livraison (Cash on Delivery)</div>"
                + inner
                + "<p style='color:#9ca3af;font-size:12px;margin-top:24px'>RedQuirk — merci pour votre confiance.</p>"
                + "</div>";
    }

    private String customerHtml(OrderResponse o) {
        String intro = "Bonjour " + esc(o.customerName()) + ", votre commande <strong>" + ref(o)
                + "</strong> a bien été enregistrée. Conservez cette référence pour suivre votre commande. "
                + "Nous vous appellerons pour confirmer la livraison. Vous payez en espèces à la réception.";
        return wrap("Commande confirmée", intro, trackButton(o) + itemsTable(o) + totals(o) + shipping(o));
    }

    private String adminHtml(OrderResponse o) {
        String intro = "Nouvelle commande <strong>" + ref(o) + "</strong> passée par "
                + esc(o.customerName()) + " (" + esc(o.email() != null ? o.email() : "—") + ").";
        return wrap("Nouvelle commande " + ref(o), intro, shipping(o) + itemsTable(o) + totals(o));
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
