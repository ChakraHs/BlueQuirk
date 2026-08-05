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

import shop.bluequirk.blue_quirk_backend.domain.DefaultEmailTemplates;
import shop.bluequirk.blue_quirk_backend.domain.EmailEvent;
import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.dto.OrderResponse;
import shop.bluequirk.blue_quirk_backend.entity.EmailTemplate;
import shop.bluequirk.blue_quirk_backend.provider.EmailProvider;
import shop.bluequirk.blue_quirk_backend.repository.EmailTemplateRepository;
import shop.bluequirk.blue_quirk_backend.utility.EmailI18n;
import shop.bluequirk.blue_quirk_backend.utility.TemplateEngine;

/**
 * Sends order emails (customer + admin) after an order is placed or its status
 * changes. Runs asynchronously and best-effort: a mail failure is logged but
 * never breaks the order, and each recipient is sent independently.
 *
 * <p><b>Language:</b> the customer's emails are rendered in the order's language
 * (the storefront locale captured at checkout — "fr" default, or "ar"); the admin
 * notification is always in the default language. For each event the active DB
 * {@link EmailTemplate} for that (code, language) is used, falling back to the
 * default-language template, then to the built-in {@link DefaultEmailTemplates}
 * seed for the language — so a language never renders as raw fallback English.
 * The pre-rendered fragments ({@code itemsTable} etc.) are built in the target
 * language too, including right-to-left layout for Arabic.
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
        String customerLang = EmailI18n.normalize(order.lang());
        // Customer confirmation — in the customer's language.
        if (order.email() != null && !order.email().isBlank()) {
            sendEvent(order.email(), EmailEvent.ORDER_PLACED_CUSTOMER, customerLang, order);
        }
        // Admin notification — always in the default (store) language.
        if (!adminEmail.isBlank()) {
            sendEvent(adminEmail, EmailEvent.ORDER_PLACED_ADMIN, EmailI18n.DEFAULT_LANG, order);
        }
    }

    /**
     * Emails the customer when an admin changes the order's status. Best-effort,
     * async, and skipped when there is no customer email or no email for the status.
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
        sendEvent(order.email(), event, EmailI18n.normalize(order.lang()), order);
    }

    /**
     * Sends an event email in the given language. Resolves the template as:
     * active (code, lang) → active (code, default lang) → built-in seed for lang.
     * Variables (incl. localized fragments) are filled for that language.
     */
    private void sendEvent(String to, EmailEvent event, String lang, OrderResponse order) {
        Map<String, String> vars = buildVars(order, lang);

        Optional<EmailTemplate> template = templateRepository.findByCodeAndLangAndActiveTrue(event.code(), lang);
        if (template.isEmpty() && !EmailI18n.DEFAULT_LANG.equals(lang)) {
            template = templateRepository.findByCodeAndLangAndActiveTrue(event.code(), EmailI18n.DEFAULT_LANG);
        }

        String subject;
        String body;
        if (template.isPresent()) {
            subject = template.get().getSubject();
            body = template.get().getBody();
        } else {
            DefaultEmailTemplates.Seed seed = DefaultEmailTemplates.forEvent(event, lang);
            subject = seed.subject();
            body = seed.body();
        }
        trySend(to, TemplateEngine.process(subject, vars), TemplateEngine.process(body, vars));
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

    /** A "Track my order" CTA button (localized), or "" when there is no tracking URL. */
    private String trackButton(OrderResponse order, String lang) {
        String url = trackUrl(order);
        if (url == null) return "";
        return "<div style='margin:18px 0'>"
                + "<a href='" + url + "' "
                + "style='display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;"
                + "font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px'>"
                + EmailI18n.t(lang, "track.button") + "</a>"
                + "<p style='margin:8px 0 0;color:#6b7280;font-size:12px'>"
                + EmailI18n.t(lang, "track.ref") + " : <strong>" + esc(ref(order)) + "</strong></p>"
                + "</div>";
    }

    /** Customer-facing reference: the order number (BQ-…) when set, else "#id". */
    private String ref(OrderResponse order) {
        return order.orderNumber() != null && !order.orderNumber().isBlank()
                ? order.orderNumber() : "#" + order.id();
    }

    /** All template variables for an order, rendered in the given language. */
    private Map<String, String> buildVars(OrderResponse o, String lang) {
        Map<String, String> v = new LinkedHashMap<>();
        v.put("storeName", storeName);
        v.put("orderRef", ref(o));
        v.put("customerName", esc(o.customerName()));
        v.put("customerEmail", esc(o.email() != null ? o.email() : ""));
        v.put("phone", esc(o.phone()));
        v.put("address", esc(o.address()));
        v.put("city", esc(o.city()));
        v.put("subtotal", money(o.subtotal()));
        v.put("shipping", o.shippingFee() == 0 ? EmailI18n.t(lang, "summary.free") : money(o.shippingFee()));
        v.put("total", money(o.total()));

        String tracking = o.trackingNumber() != null ? o.trackingNumber().trim() : "";
        v.put("trackingNumber", esc(tracking));
        v.put("trackingLine", tracking.isBlank() ? ""
                : EmailI18n.t(lang, "track.number") + " : <strong>" + esc(tracking) + "</strong>.");

        String reason = o.cancellationReason() != null ? o.cancellationReason().trim() : "";
        v.put("cancellationReason", esc(reason));
        v.put("cancellationLine", reason.isBlank() ? ""
                : EmailI18n.t(lang, "cancel.reason") + " : <strong>" + esc(reason) + "</strong>.");

        v.put("estimatedDelivery", esc(o.estimatedDelivery() != null ? o.estimatedDelivery() : ""));
        String url = trackUrl(o);
        v.put("trackUrl", url != null ? url : "");
        v.put("trackButton", trackButton(o, lang));
        v.put("itemsTable", itemsTable(o, lang));
        v.put("orderSummary", totals(o, lang));
        v.put("shippingBlock", shipping(o, lang));
        return v;
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

    private String itemsTable(OrderResponse order, String lang) {
        String start = EmailI18n.startAlign(lang);
        String end = EmailI18n.endAlign(lang);
        StringBuilder rows = new StringBuilder();
        for (OrderResponse.Item it : order.items()) {
            String variant = (it.variant() != null && !it.variant().isBlank())
                    ? "<div style='color:#6b7280;font-size:12px'>" + esc(it.variant()) + "</div>" : "";
            rows.append("<tr>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #eee;text-align:").append(start).append("'>")
                .append("<strong>").append(esc(it.name())).append("</strong>").append(variant)
                .append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #eee;text-align:center'>")
                .append(it.quantity()).append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #eee;text-align:").append(end).append("'>")
                .append(money(it.lineTotal())).append("</td>")
                .append("</tr>");
        }
        return "<table style='width:100%;border-collapse:collapse;font-size:14px'>"
                + "<thead><tr>"
                + "<th style='text-align:" + start + ";padding:8px;color:#6b7280;font-weight:600'>"
                + EmailI18n.t(lang, "item.article") + "</th>"
                + "<th style='text-align:center;padding:8px;color:#6b7280;font-weight:600'>"
                + EmailI18n.t(lang, "item.qty") + "</th>"
                + "<th style='text-align:" + end + ";padding:8px;color:#6b7280;font-weight:600'>"
                + EmailI18n.t(lang, "item.total") + "</th>"
                + "</tr></thead><tbody>" + rows + "</tbody></table>";
    }

    private String totals(OrderResponse order, String lang) {
        return "<table style='width:100%;font-size:14px;margin-top:12px'>"
                + row(lang, EmailI18n.t(lang, "summary.subtotal"), money(order.subtotal()), false)
                + row(lang, EmailI18n.t(lang, "summary.shipping"),
                        order.shippingFee() == 0 ? EmailI18n.t(lang, "summary.free") : money(order.shippingFee()), false)
                + row(lang, EmailI18n.t(lang, "summary.totalCod"), money(order.total()), true)
                + "</table>";
    }

    private String row(String lang, String label, String value, boolean bold) {
        String w = bold ? "700" : "400";
        String size = bold ? "16px" : "14px";
        String start = EmailI18n.startAlign(lang);
        String end = EmailI18n.endAlign(lang);
        return "<tr><td style='padding:4px 0;text-align:" + start + ";font-weight:" + w + ";font-size:" + size + "'>"
                + esc(label) + "</td>"
                + "<td style='padding:4px 0;text-align:" + end + ";font-weight:" + w + ";font-size:" + size + "'>"
                + value + "</td></tr>";
    }

    private String shipping(OrderResponse o, String lang) {
        String note = (o.note() != null && !o.note().isBlank())
                ? "<p style='margin:6px 0;color:#374151'><strong>" + EmailI18n.t(lang, "shipping.note")
                  + ":</strong> " + esc(o.note()) + "</p>" : "";
        return "<div style='background:#f9fafb;border-radius:10px;padding:16px;margin-top:16px'>"
                + "<p style='margin:0 0 6px;font-weight:600'>" + EmailI18n.t(lang, "shipping.heading") + "</p>"
                + "<p style='margin:2px 0;color:#374151'>" + esc(o.customerName()) + " — " + esc(o.phone()) + "</p>"
                + "<p style='margin:2px 0;color:#374151'>" + esc(o.address()) + ", " + esc(o.city()) + "</p>"
                + note + "</div>";
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
