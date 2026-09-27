package shop.bluequirk.blue_quirk_backend.careguide.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import shop.bluequirk.blue_quirk_backend.careguide.entity.CareGuideTemplate;
import shop.bluequirk.blue_quirk_backend.careguide.entity.CareGuideTemplateTranslation;
import shop.bluequirk.blue_quirk_backend.careguide.repository.CareGuideTemplateRepository;
import shop.bluequirk.blue_quirk_backend.domain.ProductType;

/**
 * Seeds two editable starter "Care &amp; Wear" templates (T-shirt, hoodie) ONCE,
 * only when no templates exist yet. They are plain <b>default values</b> the admin
 * edits freely afterwards (Admin → Catalog → Care &amp; Wear); never overwritten
 * on restart, so admin edits survive.
 *
 * <p>The copy is deliberately cautious and uses only facts confirmed in the
 * codebase (cotton base fabric; the general print-care advice of washing inside
 * out, gentle cycle, no bleach, no direct ironing on the print). Anything not
 * confirmed — exact composition/weight per product, wash temperature, printing
 * method — is left as an inline "⚠️ To review" marker for the admin to confirm
 * and remove before publishing.
 */
@Component
@Order(70)
public class CareGuideSeeder implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(CareGuideSeeder.class);

    private final CareGuideTemplateRepository repository;

    public CareGuideSeeder(CareGuideTemplateRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (repository.count() > 0) {
            return; // already seeded / admin-managed — never touch it again
        }
        repository.save(tshirtTemplate());
        repository.save(hoodieTemplate());
        LOG.info("Seeded 2 starter Care & Wear templates (T-shirt, hoodie). "
                + "Review the '⚠️ To review' markers and edit them in Admin → Care & Wear.");
    }

    private CareGuideTemplate tshirtTemplate() {
        CareGuideTemplate t = new CareGuideTemplate();
        t.setName("T-shirt — Care & Wear");
        t.setProductType(ProductType.T_SHIRT);
        t.setSeeded(true);
        t.setCreatedByEmail("system");
        t.setUpdatedByEmail("system");

        t.getTranslations().add(tr(t, "fr",
                "T-shirt en coton, doux et respirant, agréable à porter au quotidien. ⚠️ À vérifier : confirmez la composition exacte du tissu pour ce produit.",
                "Lavez le t-shirt sur l'envers, en machine sur cycle délicat, avec des couleurs similaires. Évitez l'eau de Javel et les adoucissants agressifs. Privilégiez un séchage à l'air libre ; évitez le sèche-linge à haute température pour préserver la forme. ⚠️ À vérifier : température de lavage recommandée.",
                "Repassez sur l'envers, à basse température si nécessaire. Ne repassez jamais directement sur l'impression.",
                "Pour préserver l'impression, lavez toujours sur l'envers et évitez de frotter ou d'étirer le motif. Ne repassez pas directement dessus. ⚠️ À vérifier : méthode d'impression et consignes spécifiques du fournisseur.",
                "Ne laissez pas tremper longtemps. Rangez à plat ou sur cintre. Un premier lavage à froid aide à garder les couleurs éclatantes."));

        t.getTranslations().add(tr(t, "en",
                "A soft, breathable cotton t-shirt that's comfortable for everyday wear. ⚠️ To review: confirm the exact fabric composition for this product.",
                "Wash the t-shirt inside out on a gentle machine cycle with similar colours. Avoid bleach and harsh softeners. Air-dry when possible; avoid high-heat tumble drying to keep the shape. ⚠️ To review: recommended wash temperature.",
                "Iron inside out on low heat if needed. Never iron directly over the print.",
                "To protect the print, always wash inside out and avoid rubbing or stretching the design. Do not iron directly on it. ⚠️ To review: printing method and any supplier-specific care instructions.",
                "Don't leave it soaking for long. Store folded flat or on a hanger. A first cold wash helps keep colours vivid."));

        t.getTranslations().add(tr(t, "ar",
                "تي شيرت من القطن، ناعم ويسمح بمرور الهواء، ومريح للارتداء اليومي. ⚠️ للمراجعة: أكّد التركيبة الدقيقة للقماش لهذا المنتج.",
                "اغسل التي شيرت مقلوبًا على دورة لطيفة مع ألوان متشابهة. تجنّب المبيّض والمنعّمات القوية. جفّفه في الهواء كلما أمكن، وتجنّب التجفيف بحرارة عالية للحفاظ على شكله. ⚠️ للمراجعة: درجة حرارة الغسيل الموصى بها.",
                "اكوِ القطعة من الداخل على حرارة منخفضة عند الحاجة. لا تكوِ أبدًا فوق الطبعة مباشرة.",
                "للحفاظ على الطبعة، اغسل القطعة مقلوبة دائمًا وتجنّب فرك أو شدّ التصميم. لا تكوِ فوقها مباشرة. ⚠️ للمراجعة: طريقة الطباعة وأي تعليمات خاصة من المورّد.",
                "لا تتركه منقوعًا طويلًا. خزّنه مطويًا أو على علاقة. الغسل الأول بماء بارد يساعد على بقاء الألوان زاهية."));

        return t;
    }

    private CareGuideTemplate hoodieTemplate() {
        CareGuideTemplate t = new CareGuideTemplate();
        t.setName("Hoodie — Care & Wear");
        t.setProductType(ProductType.HOODIE);
        t.setSeeded(true);
        t.setCreatedByEmail("system");
        t.setUpdatedByEmail("system");

        t.getTranslations().add(tr(t, "fr",
                "Hoodie en coton, à la maille plus épaisse et à la coupe ample (oversize), chaud et confortable. ⚠️ À vérifier : confirmez la composition et le grammage exacts pour ce produit.",
                "Lavez sur l'envers, en machine sur cycle délicat, avec des couleurs similaires ; fermez la fermeture éclair ou les cordons s'il y en a. Évitez l'eau de Javel. Séchez à plat de préférence pour éviter que le vêtement ne se déforme ; évitez le sèche-linge à haute température. ⚠️ À vérifier : température de lavage recommandée.",
                "Repassez sur l'envers à basse température si nécessaire. Ne repassez pas directement sur l'impression.",
                "Lavez sur l'envers et évitez de frotter le motif. Ne repassez pas directement dessus. ⚠️ À vérifier : méthode d'impression et consignes spécifiques du fournisseur.",
                "Séchez à plat pour préserver la coupe oversize. Évitez de le suspendre mouillé trop longtemps (les épaules peuvent se marquer). Rangez plié."));

        t.getTranslations().add(tr(t, "en",
                "A cotton hoodie with a thicker knit and a relaxed, oversized fit — warm and cosy. ⚠️ To review: confirm the exact composition and fabric weight for this product.",
                "Wash inside out on a gentle cycle with similar colours; close any zip or drawcords first. Avoid bleach. Dry flat where possible to avoid stretching; avoid high-heat tumble drying. ⚠️ To review: recommended wash temperature.",
                "Iron inside out on low heat if needed. Do not iron directly over the print.",
                "Wash inside out and avoid rubbing the design. Do not iron directly on it. ⚠️ To review: printing method and any supplier-specific care instructions.",
                "Dry flat to keep the oversized shape. Avoid hanging it while wet for long (shoulders can mark). Store folded."));

        t.getTranslations().add(tr(t, "ar",
                "هودي من القطن بنسيج أكثر سماكة وقصّة واسعة (أوفرسايز)، دافئ ومريح. ⚠️ للمراجعة: أكّد التركيبة والوزن الدقيق للقماش لهذا المنتج.",
                "اغسله مقلوبًا على دورة لطيفة مع ألوان متشابهة، وأغلق السحّاب أو الأربطة إن وُجدت. تجنّب المبيّض. جفّفه مفرودًا كلما أمكن لتفادي التمدد، وتجنّب التجفيف بحرارة عالية. ⚠️ للمراجعة: درجة حرارة الغسيل الموصى بها.",
                "اكوِه من الداخل على حرارة منخفضة عند الحاجة. لا تكوِ فوق الطبعة مباشرة.",
                "اغسله مقلوبًا وتجنّب فرك التصميم. لا تكوِ فوقه مباشرة. ⚠️ للمراجعة: طريقة الطباعة وأي تعليمات خاصة من المورّد.",
                "جفّفه مفرودًا للحفاظ على القصّة الواسعة. تجنّب تعليقه مبللًا لفترة طويلة (قد تتأثر الأكتاف). خزّنه مطويًا."));

        return t;
    }

    private CareGuideTemplateTranslation tr(CareGuideTemplate parent, String lang,
            String fabricAndFeel, String washingAndDrying, String ironing, String printCare, String tips) {
        CareGuideTemplateTranslation tr = new CareGuideTemplateTranslation();
        tr.setLang(lang);
        tr.setFabricAndFeel(fabricAndFeel);
        tr.setWashingAndDrying(washingAndDrying);
        tr.setIroning(ironing);
        tr.setPrintCare(printCare);
        tr.setTips(tips);
        tr.setTemplate(parent);
        return tr;
    }
}
