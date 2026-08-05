package shop.bluequirk.blue_quirk_backend.utility;

import java.util.List;
import java.util.Map;

/**
 * Localization helper for transactional emails. The store speaks the same two
 * languages as the storefront — French (default) and Arabic — so emails are
 * rendered in the recipient's language, falling back to the default when the
 * language is unknown or unsupported.
 *
 * <p>Holds the short UI labels used inside the pre-rendered HTML fragments
 * (item table headers, totals, delivery block, buttons). Longer, editable copy
 * (subjects, intros, whole layouts) lives in
 * {@link shop.bluequirk.blue_quirk_backend.domain.DefaultEmailTemplates}, which
 * also consults this helper for direction/alignment.
 */
public final class EmailI18n {

    private EmailI18n() {}

    public static final String DEFAULT_LANG = "fr";
    public static final List<String> SUPPORTED = List.of("fr", "ar");

    /**
     * Normalizes an arbitrary locale-ish string (e.g. "AR", "fr-FR", "ar_MA",
     * null) to one of the supported languages, defaulting to French.
     */
    public static String normalize(String lang) {
        if (lang == null || lang.isBlank()) {
            return DEFAULT_LANG;
        }
        String code = lang.trim().toLowerCase();
        if (code.length() > 2) {
            code = code.substring(0, 2);
        }
        return SUPPORTED.contains(code) ? code : DEFAULT_LANG;
    }

    public static boolean isRtl(String lang) {
        return "ar".equals(normalize(lang));
    }

    /** HTML {@code dir} attribute value for the language. */
    public static String dir(String lang) {
        return isRtl(lang) ? "rtl" : "ltr";
    }

    /** Where a line of text/table starts (block-start): left for LTR, right for RTL. */
    public static String startAlign(String lang) {
        return isRtl(lang) ? "right" : "left";
    }

    /** Where a line of text/table ends (block-end): right for LTR, left for RTL. */
    public static String endAlign(String lang) {
        return isRtl(lang) ? "left" : "right";
    }

    // key -> { fr, ar }. French is the source/default; a missing Arabic value
    // falls back to French so a template never renders a raw key.
    private static final Map<String, String[]> LABELS = Map.ofEntries(
            Map.entry("item.article", new String[]{"Article", "المنتج"}),
            Map.entry("item.qty", new String[]{"Qté", "الكمية"}),
            Map.entry("item.total", new String[]{"Total", "المجموع"}),
            Map.entry("summary.subtotal", new String[]{"Sous-total", "المجموع الفرعي"}),
            Map.entry("summary.shipping", new String[]{"Livraison", "الشحن"}),
            Map.entry("summary.free", new String[]{"Gratuite", "مجاني"}),
            Map.entry("summary.totalCod", new String[]{
                    "Total (à payer à la livraison)", "المجموع (يُدفع عند الاستلام)"}),
            Map.entry("summary.totalPaid", new String[]{"Total payé", "المبلغ المدفوع"}),
            Map.entry("shipping.heading", new String[]{"Livraison", "التوصيل"}),
            Map.entry("shipping.note", new String[]{"Note", "ملاحظة"}),
            Map.entry("track.button", new String[]{"Suivre ma commande", "تتبّع طلبي"}),
            Map.entry("track.ref", new String[]{"Référence", "المرجع"}),
            Map.entry("track.number", new String[]{"Numéro de suivi", "رقم التتبّع"}),
            Map.entry("cancel.reason", new String[]{"Motif", "السبب"}),
            Map.entry("cod.badge", new String[]{
                    "Paiement à la livraison", "الدفع عند الاستلام"}),
            Map.entry("footer.thanks", new String[]{
                    "merci pour votre confiance.", "شكرًا لثقتكم بنا."})
    );

    /** A short localized UI label by key (French default). */
    public static String t(String lang, String key) {
        String[] pair = LABELS.get(key);
        if (pair == null) {
            return key;
        }
        String value = isRtl(lang) ? pair[1] : pair[0];
        return (value == null || value.isBlank()) ? pair[0] : value;
    }
}
