package shop.bluequirk.blue_quirk_backend.domain;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The variables available to order email templates (via {@code {{name}}}
 * placeholders) plus sample values used to render previews in the admin. The
 * same variable set is populated for every order event by
 * OrderNotificationService — unused ones simply don't appear in a given template.
 */
public final class EmailTemplateCatalog {

    private EmailTemplateCatalog() {}

    public record VariableInfo(String name, String description) {}

    public static final List<VariableInfo> VARIABLES = List.of(
            new VariableInfo("storeName", "Store name (e.g. RedQuirk)"),
            new VariableInfo("orderRef", "Order reference (e.g. BQ-2026-000001)"),
            new VariableInfo("customerName", "Customer full name"),
            new VariableInfo("customerEmail", "Customer email address"),
            new VariableInfo("phone", "Customer phone number"),
            new VariableInfo("address", "Delivery address"),
            new VariableInfo("city", "Delivery city"),
            new VariableInfo("subtotal", "Items subtotal, formatted with currency"),
            new VariableInfo("shipping", "Shipping fee, formatted (or 'Free')"),
            new VariableInfo("total", "Order total, formatted with currency"),
            new VariableInfo("trackingNumber", "Carrier tracking number (may be empty)"),
            new VariableInfo("trackingLine", "A ready sentence with the tracking number (empty when none)"),
            new VariableInfo("cancellationReason", "Cancellation reason (may be empty)"),
            new VariableInfo("cancellationLine", "A ready sentence with the cancellation reason (empty when none)"),
            new VariableInfo("estimatedDelivery", "Estimated delivery date (may be empty)"),
            new VariableInfo("trackUrl", "Public order-tracking URL"),
            new VariableInfo("trackButton", "Pre-styled 'Track my order' button (empty when no tracking URL)"),
            new VariableInfo("itemsTable", "Pre-rendered HTML table of ordered items"),
            new VariableInfo("orderSummary", "Pre-rendered subtotal / shipping / total table"),
            new VariableInfo("shippingBlock", "Pre-rendered delivery address block")
    );

    /** Realistic placeholder values so the admin preview looks like a real email. */
    public static Map<String, String> sampleVariables() {
        Map<String, String> v = new LinkedHashMap<>();
        v.put("storeName", "RedQuirk");
        v.put("orderRef", "BQ-2026-000042");
        v.put("customerName", "Sara Bennani");
        v.put("customerEmail", "sara@example.com");
        v.put("phone", "+212 6 12 34 56 78");
        v.put("address", "12 Rue des Oudayas");
        v.put("city", "Rabat");
        v.put("subtotal", "260.00 DH");
        v.put("shipping", "29.00 DH");
        v.put("total", "289.00 DH");
        v.put("trackingNumber", "MA123456789");
        v.put("trackingLine", "Tracking number: <strong>MA123456789</strong>.");
        v.put("cancellationReason", "Out of stock");
        v.put("cancellationLine", "Reason: <strong>Out of stock</strong>.");
        v.put("estimatedDelivery", "2026-07-10");
        v.put("trackUrl", "https://bluequirk.ma/order-tracking?order=BQ-2026-000042");
        v.put("trackButton",
                "<div style='margin:18px 0'><a href='#' style='display:inline-block;background:#2563eb;"
                + "color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;"
                + "border-radius:999px'>Track my order</a></div>");
        v.put("itemsTable",
                "<table style='width:100%;border-collapse:collapse;font-size:14px'><tbody>"
                + "<tr><td style='padding:10px 8px;border-bottom:1px solid #eee'><strong>Regular Premium Unisex T-Shirt</strong>"
                + "<div style='color:#6b7280;font-size:12px'>Black / M</div></td>"
                + "<td style='padding:10px 8px;border-bottom:1px solid #eee;text-align:center'>2</td>"
                + "<td style='padding:10px 8px;border-bottom:1px solid #eee;text-align:right'>260.00 DH</td></tr>"
                + "</tbody></table>");
        v.put("orderSummary",
                "<table style='width:100%;font-size:14px;margin-top:12px'>"
                + "<tr><td>Subtotal</td><td style='text-align:right'>260.00 DH</td></tr>"
                + "<tr><td>Shipping</td><td style='text-align:right'>29.00 DH</td></tr>"
                + "<tr><td style='font-weight:700'>Total (cash on delivery)</td>"
                + "<td style='text-align:right;font-weight:700'>289.00 DH</td></tr></table>");
        v.put("shippingBlock",
                "<div style='background:#f9fafb;border-radius:10px;padding:16px;margin-top:16px'>"
                + "<p style='margin:0 0 6px;font-weight:600'>Delivery</p>"
                + "<p style='margin:2px 0;color:#374151'>Sara Bennani — +212 6 12 34 56 78</p>"
                + "<p style='margin:2px 0;color:#374151'>12 Rue des Oudayas, Rabat</p></div>");
        return v;
    }
}
