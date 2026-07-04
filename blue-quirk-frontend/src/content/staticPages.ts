// Localized content for the storefront's static/informational pages (the ones
// linked from the footer: About, Contact, Shipping, Returns, Size Guide, etc.).
// Content is plain data so a single dynamic route (`app/[lang]/[slug]`) and a
// single presentational component can render every page. Product/category
// content is localized separately by the backend; this covers editorial copy.
import type { LangCode } from "@/lib/lang";

export type PageBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] };

export type StaticPageContent = {
  title: string;
  subtitle: string;
  blocks: PageBlock[];
};

// Slugs are the URL segments under /[lang]/... and match the footer links.
export const STATIC_PAGE_SLUGS = [
  "about",
  "contact",
  "shipping",
  "returns",
  "size-guide",
  "sell-art",
  "careers",
  "blog",
  "press",
  "privacy",
  "terms",
  "cookies",
] as const;

export type StaticPageSlug = (typeof STATIC_PAGE_SLUGS)[number];

export function isStaticPageSlug(value: string): value is StaticPageSlug {
  return (STATIC_PAGE_SLUGS as readonly string[]).includes(value);
}

// Contact details surfaced on the Contact page. Placeholder values — update
// these to your real support channels.
export const CONTACT = {
  email: "hello@bluequirk.ma",
  support: "support@bluequirk.ma",
  phone: "+212 5 20 00 00 00",
};

type PageMap = Record<StaticPageSlug, Record<LangCode, StaticPageContent>>;

const PAGES: PageMap = {
  about: {
    fr: {
      title: "À propos de BlueQuirk",
      subtitle:
        "Un art étrangement parlant, porté par une communauté d'artistes indépendants.",
      blocks: [
        { type: "h", text: "Notre histoire" },
        {
          type: "p",
          text: "BlueQuirk est né d'une idée simple : faire vivre les créations d'artistes indépendants sur des produits du quotidien, accessibles partout au Maroc. Chaque design raconte une histoire, et chaque commande soutient directement un créateur.",
        },
        { type: "h", text: "Notre mission" },
        {
          type: "p",
          text: "Nous voulons rendre l'art original accessible à tous, sans compromis sur la qualité. Nous sélectionnons des matières durables, imprimons à la demande pour limiter le gaspillage, et livrons dans tout le Maroc avec paiement à la livraison.",
        },
        { type: "h", text: "Pourquoi nous choisir" },
        {
          type: "ul",
          items: [
            "Des créations originales, en édition limitée, introuvables ailleurs.",
            "Une qualité premium : impression durable et matières confortables.",
            "Livraison dans tout le Maroc, paiement à la livraison.",
            "Chaque achat soutient un artiste indépendant.",
          ],
        },
      ],
    },
    en: {
      title: "About BlueQuirk",
      subtitle:
        "Weirdly meaningful art, powered by a community of independent artists.",
      blocks: [
        { type: "h", text: "Our story" },
        {
          type: "p",
          text: "BlueQuirk started from a simple idea: bring the work of independent artists to everyday products, accessible everywhere in Morocco. Every design tells a story, and every order directly supports a creator.",
        },
        { type: "h", text: "Our mission" },
        {
          type: "p",
          text: "We want to make original art accessible to everyone, with no compromise on quality. We choose durable materials, print on demand to reduce waste, and deliver across Morocco with cash on delivery.",
        },
        { type: "h", text: "Why choose us" },
        {
          type: "ul",
          items: [
            "Original, limited-edition designs you won't find anywhere else.",
            "Premium quality: durable printing and comfortable materials.",
            "Delivery across Morocco, cash on delivery.",
            "Every purchase supports an independent artist.",
          ],
        },
      ],
    },
    ar: {
      title: "من نحن — BlueQuirk",
      subtitle: "فنّ ذو معنى مميّز، يقوده مجتمع من الفنانين المستقلين.",
      blocks: [
        { type: "h", text: "قصّتنا" },
        {
          type: "p",
          text: "وُلدت BlueQuirk من فكرة بسيطة: نقل إبداعات الفنانين المستقلين إلى منتجات يومية، متاحة في كل أنحاء المغرب. كل تصميم يحكي قصّة، وكل طلب يدعم مبدعًا بشكل مباشر.",
        },
        { type: "h", text: "مهمّتنا" },
        {
          type: "p",
          text: "نريد أن نجعل الفنّ الأصلي في متناول الجميع، دون أي تنازل عن الجودة. نختار موادّ متينة، ونطبع عند الطلب للحدّ من الهدر، ونوصّل إلى كل أنحاء المغرب مع الدفع عند الاستلام.",
        },
        { type: "h", text: "لماذا تختارنا" },
        {
          type: "ul",
          items: [
            "تصاميم أصلية بإصدار محدود لا تجدها في مكان آخر.",
            "جودة عالية: طباعة متينة وموادّ مريحة.",
            "توصيل لكل أنحاء المغرب، مع الدفع عند الاستلام.",
            "كل عملية شراء تدعم فنانًا مستقلًا.",
          ],
        },
      ],
    },
  },

  contact: {
    fr: {
      title: "Nous contacter",
      subtitle: "Une question ? Notre équipe locale est là pour vous aider.",
      blocks: [
        { type: "h", text: "Écrivez-nous" },
        {
          type: "p",
          text: `Pour toute question sur une commande, un produit ou un partenariat, écrivez-nous à ${CONTACT.email}. Nous répondons généralement sous 24 heures ouvrables.`,
        },
        { type: "h", text: "Support commandes" },
        {
          type: "p",
          text: `Un souci avec une commande en cours ? Contactez ${CONTACT.support} ou appelez-nous au ${CONTACT.phone}, du lundi au samedi, de 9h à 18h.`,
        },
        { type: "h", text: "Suivi de commande" },
        {
          type: "p",
          text: "Vous pouvez suivre l'état de votre commande à tout moment grâce à votre numéro de commande depuis la page de suivi.",
        },
      ],
    },
    en: {
      title: "Contact us",
      subtitle: "Have a question? Our local team is here to help.",
      blocks: [
        { type: "h", text: "Write to us" },
        {
          type: "p",
          text: `For any question about an order, a product or a partnership, email us at ${CONTACT.email}. We usually reply within 24 business hours.`,
        },
        { type: "h", text: "Order support" },
        {
          type: "p",
          text: `An issue with a current order? Reach ${CONTACT.support} or call us at ${CONTACT.phone}, Monday to Saturday, 9am–6pm.`,
        },
        { type: "h", text: "Order tracking" },
        {
          type: "p",
          text: "You can check the status of your order anytime using your order number on the tracking page.",
        },
      ],
    },
    ar: {
      title: "اتصل بنا",
      subtitle: "لديك سؤال؟ فريقنا المحلي هنا لمساعدتك.",
      blocks: [
        { type: "h", text: "راسِلنا" },
        {
          type: "p",
          text: `لأي سؤال حول طلب أو منتج أو شراكة، راسلنا على ${CONTACT.email}. نردّ عادةً خلال 24 ساعة عمل.`,
        },
        { type: "h", text: "دعم الطلبات" },
        {
          type: "p",
          text: `هل لديك مشكلة في طلب حالي؟ تواصل مع ${CONTACT.support} أو اتصل بنا على ${CONTACT.phone}، من الإثنين إلى السبت، من 9 صباحًا إلى 6 مساءً.`,
        },
        { type: "h", text: "تتبّع الطلب" },
        {
          type: "p",
          text: "يمكنك متابعة حالة طلبك في أي وقت باستخدام رقم الطلب من صفحة التتبّع.",
        },
      ],
    },
  },

  shipping: {
    fr: {
      title: "Livraison",
      subtitle: "Livraison rapide et fiable dans tout le Maroc.",
      blocks: [
        { type: "h", text: "Zones et délais" },
        {
          type: "p",
          text: "Nous livrons dans toutes les villes du Maroc. Les commandes sont préparées sous 1 à 2 jours ouvrables, puis expédiées pour une réception sous 3 à 5 jours ouvrables selon votre région.",
        },
        { type: "h", text: "Frais de livraison" },
        {
          type: "ul",
          items: [
            "Livraison standard : 29 DH.",
            "Livraison offerte dès 300 DH d'achat.",
            "Paiement à la livraison (espèces) partout au Maroc.",
          ],
        },
        { type: "h", text: "Suivi" },
        {
          type: "p",
          text: "Dès l'expédition, vous recevez une confirmation. Suivez l'avancement de votre commande à tout moment avec votre numéro de commande.",
        },
      ],
    },
    en: {
      title: "Shipping",
      subtitle: "Fast, reliable delivery across Morocco.",
      blocks: [
        { type: "h", text: "Areas & timing" },
        {
          type: "p",
          text: "We deliver to every city in Morocco. Orders are prepared within 1–2 business days, then shipped for delivery within 3–5 business days depending on your region.",
        },
        { type: "h", text: "Shipping fees" },
        {
          type: "ul",
          items: [
            "Standard delivery: 29 DH.",
            "Free delivery on orders over 300 DH.",
            "Cash on delivery available everywhere in Morocco.",
          ],
        },
        { type: "h", text: "Tracking" },
        {
          type: "p",
          text: "As soon as your order ships, you'll get a confirmation. Track its progress anytime with your order number.",
        },
      ],
    },
    ar: {
      title: "الشحن",
      subtitle: "توصيل سريع وموثوق في كل أنحاء المغرب.",
      blocks: [
        { type: "h", text: "المناطق والمدد" },
        {
          type: "p",
          text: "نوصّل إلى جميع مدن المغرب. تُجهَّز الطلبات خلال يوم إلى يومين من أيام العمل، ثم تُشحن ليصلك الطلب خلال 3 إلى 5 أيام عمل حسب منطقتك.",
        },
        { type: "h", text: "رسوم التوصيل" },
        {
          type: "ul",
          items: [
            "التوصيل العادي: 29 درهم.",
            "توصيل مجاني ابتداءً من 300 درهم.",
            "الدفع عند الاستلام (نقدًا) متاح في كل أنحاء المغرب.",
          ],
        },
        { type: "h", text: "التتبّع" },
        {
          type: "p",
          text: "بمجرّد شحن طلبك ستصلك رسالة تأكيد. تابع تقدّم الطلب في أي وقت باستخدام رقم الطلب.",
        },
      ],
    },
  },

  returns: {
    fr: {
      title: "Retours & échanges",
      subtitle: "Votre satisfaction est notre priorité.",
      blocks: [
        { type: "h", text: "Politique de retour" },
        {
          type: "p",
          text: "Vous disposez de 14 jours après réception pour demander un retour ou un échange. Les articles doivent être non portés, non lavés et dans leur état d'origine.",
        },
        { type: "h", text: "Comment faire" },
        {
          type: "ul",
          items: [
            `Contactez-nous à ${CONTACT.support} avec votre numéro de commande.`,
            "Nous vous indiquons la marche à suivre pour le retour.",
            "Après réception et vérification, l'échange ou le remboursement est traité.",
          ],
        },
        { type: "h", text: "Articles défectueux" },
        {
          type: "p",
          text: "Si un article arrive endommagé ou présente un défaut d'impression, contactez-nous sous 48 heures avec une photo : nous le remplaçons sans frais.",
        },
      ],
    },
    en: {
      title: "Returns & exchanges",
      subtitle: "Your satisfaction is our priority.",
      blocks: [
        { type: "h", text: "Return policy" },
        {
          type: "p",
          text: "You have 14 days after delivery to request a return or exchange. Items must be unworn, unwashed and in their original condition.",
        },
        { type: "h", text: "How it works" },
        {
          type: "ul",
          items: [
            `Contact us at ${CONTACT.support} with your order number.`,
            "We'll walk you through the return steps.",
            "Once we receive and check the item, we process the exchange or refund.",
          ],
        },
        { type: "h", text: "Defective items" },
        {
          type: "p",
          text: "If an item arrives damaged or has a printing defect, contact us within 48 hours with a photo — we'll replace it at no cost.",
        },
      ],
    },
    ar: {
      title: "الإرجاع والاستبدال",
      subtitle: "رضاك هو أولويتنا.",
      blocks: [
        { type: "h", text: "سياسة الإرجاع" },
        {
          type: "p",
          text: "لديك 14 يومًا بعد الاستلام لطلب الإرجاع أو الاستبدال. يجب أن تكون المنتجات غير مستعملة وغير مغسولة وبحالتها الأصلية.",
        },
        { type: "h", text: "كيف تتمّ العملية" },
        {
          type: "ul",
          items: [
            `تواصل معنا على ${CONTACT.support} مع رقم طلبك.`,
            "سنرشدك إلى خطوات الإرجاع.",
            "بعد استلام المنتج والتحقّق منه، نعالج الاستبدال أو الاسترجاع.",
          ],
        },
        { type: "h", text: "المنتجات المعيبة" },
        {
          type: "p",
          text: "إذا وصلك منتج تالف أو به عيب في الطباعة، تواصل معنا خلال 48 ساعة مع صورة — سنستبدله دون أي تكلفة.",
        },
      ],
    },
  },

  "size-guide": {
    fr: {
      title: "Guide des tailles",
      subtitle: "Trouvez la coupe parfaite avant de commander.",
      blocks: [
        { type: "h", text: "T-shirts (unisexe)" },
        {
          type: "table",
          head: ["Taille", "Poitrine (cm)", "Longueur (cm)"],
          rows: [
            ["S", "92–96", "69"],
            ["M", "98–102", "71"],
            ["L", "104–108", "73"],
            ["XL", "110–114", "75"],
            ["XXL", "116–120", "77"],
          ],
        },
        { type: "h", text: "Comment mesurer" },
        {
          type: "ul",
          items: [
            "Poitrine : mesurez à l'endroit le plus large, sous les bras.",
            "Longueur : de l'épaule jusqu'au bas du vêtement.",
            "En cas d'hésitation entre deux tailles, choisissez la plus grande.",
          ],
        },
        {
          type: "p",
          text: "Les mesures peuvent varier de 1 à 2 cm selon le modèle. Un doute ? Écrivez-nous, nous vous conseillons volontiers.",
        },
      ],
    },
    en: {
      title: "Size guide",
      subtitle: "Find your perfect fit before you order.",
      blocks: [
        { type: "h", text: "T-shirts (unisex)" },
        {
          type: "table",
          head: ["Size", "Chest (cm)", "Length (cm)"],
          rows: [
            ["S", "92–96", "69"],
            ["M", "98–102", "71"],
            ["L", "104–108", "73"],
            ["XL", "110–114", "75"],
            ["XXL", "116–120", "77"],
          ],
        },
        { type: "h", text: "How to measure" },
        {
          type: "ul",
          items: [
            "Chest: measure at the widest point, under the arms.",
            "Length: from the shoulder to the bottom hem.",
            "Between two sizes? Go with the larger one.",
          ],
        },
        {
          type: "p",
          text: "Measurements may vary by 1–2 cm depending on the style. Unsure? Message us and we'll gladly advise.",
        },
      ],
    },
    ar: {
      title: "دليل المقاسات",
      subtitle: "اعثر على المقاس المثالي قبل الطلب.",
      blocks: [
        { type: "h", text: "التي شيرت (للجنسين)" },
        {
          type: "table",
          head: ["المقاس", "الصدر (سم)", "الطول (سم)"],
          rows: [
            ["S", "92–96", "69"],
            ["M", "98–102", "71"],
            ["L", "104–108", "73"],
            ["XL", "110–114", "75"],
            ["XXL", "116–120", "77"],
          ],
        },
        { type: "h", text: "كيف تقيس" },
        {
          type: "ul",
          items: [
            "الصدر: قِس عند أوسع نقطة، تحت الإبطين.",
            "الطول: من الكتف إلى أسفل القطعة.",
            "بين مقاسين؟ اختر الأكبر.",
          ],
        },
        {
          type: "p",
          text: "قد تختلف المقاسات بمقدار 1 إلى 2 سم حسب الموديل. غير متأكد؟ راسِلنا وسنساعدك بكل سرور.",
        },
      ],
    },
  },

  "sell-art": {
    fr: {
      title: "Vendez votre art",
      subtitle: "Transformez vos créations en produits, sans stock ni risque.",
      blocks: [
        { type: "h", text: "Comment ça marche" },
        {
          type: "p",
          text: "Vous créez, nous nous occupons du reste : impression, logistique, paiement et service client. Vous touchez une commission sur chaque vente, sans avancer le moindre frais.",
        },
        { type: "h", text: "Ce dont vous avez besoin" },
        {
          type: "ul",
          items: [
            "Des designs originaux dont vous détenez les droits.",
            "Des fichiers en haute résolution.",
            "L'envie de partager votre univers avec une communauté.",
          ],
        },
        { type: "h", text: "Rejoignez-nous" },
        {
          type: "p",
          text: `Envoyez-nous votre portfolio à ${CONTACT.email} avec l'objet « Vendez votre art ». Nous revenons vers vous rapidement.`,
        },
      ],
    },
    en: {
      title: "Sell your art",
      subtitle: "Turn your designs into products — no inventory, no risk.",
      blocks: [
        { type: "h", text: "How it works" },
        {
          type: "p",
          text: "You create, we handle the rest: printing, logistics, payment and customer service. You earn a commission on every sale without paying anything upfront.",
        },
        { type: "h", text: "What you need" },
        {
          type: "ul",
          items: [
            "Original designs you own the rights to.",
            "High-resolution files.",
            "The drive to share your world with a community.",
          ],
        },
        { type: "h", text: "Join us" },
        {
          type: "p",
          text: `Send us your portfolio at ${CONTACT.email} with the subject "Sell your art". We'll get back to you quickly.`,
        },
      ],
    },
    ar: {
      title: "بِع فنّك",
      subtitle: "حوّل تصاميمك إلى منتجات، دون مخزون ودون مخاطرة.",
      blocks: [
        { type: "h", text: "كيف يعمل" },
        {
          type: "p",
          text: "أنت تُبدع، ونحن نتكفّل بالباقي: الطباعة واللوجستيك والدفع وخدمة العملاء. تحصل على عمولة عن كل عملية بيع دون دفع أي مبلغ مسبقًا.",
        },
        { type: "h", text: "ما تحتاجه" },
        {
          type: "ul",
          items: [
            "تصاميم أصلية تملك حقوقها.",
            "ملفات بدقّة عالية.",
            "الرغبة في مشاركة عالمك مع مجتمع.",
          ],
        },
        { type: "h", text: "انضمّ إلينا" },
        {
          type: "p",
          text: `أرسل لنا أعمالك على ${CONTACT.email} مع عنوان «بِع فنّك». سنعود إليك بسرعة.`,
        },
      ],
    },
  },

  careers: {
    fr: {
      title: "Carrières",
      subtitle: "Construisons ensemble la marque créative du Maroc.",
      blocks: [
        { type: "h", text: "Travailler chez BlueQuirk" },
        {
          type: "p",
          text: "Nous sommes une petite équipe passionnée par le design, la technologie et le commerce. Nous valorisons la curiosité, l'autonomie et le soin apporté aux détails.",
        },
        { type: "h", text: "Candidatures spontanées" },
        {
          type: "p",
          text: `Nous n'avons pas toujours de poste ouvert, mais nous aimons rencontrer des personnes talentueuses. Envoyez votre CV à ${CONTACT.email} avec l'objet « Carrières ».`,
        },
      ],
    },
    en: {
      title: "Careers",
      subtitle: "Let's build Morocco's creative brand together.",
      blocks: [
        { type: "h", text: "Working at BlueQuirk" },
        {
          type: "p",
          text: "We're a small team passionate about design, technology and commerce. We value curiosity, ownership and care for the details.",
        },
        { type: "h", text: "Open applications" },
        {
          type: "p",
          text: `We don't always have an open role, but we love meeting talented people. Send your resume to ${CONTACT.email} with the subject "Careers".`,
        },
      ],
    },
    ar: {
      title: "وظائف",
      subtitle: "لنبنِ معًا العلامة الإبداعية للمغرب.",
      blocks: [
        { type: "h", text: "العمل في BlueQuirk" },
        {
          type: "p",
          text: "نحن فريق صغير شغوف بالتصميم والتكنولوجيا والتجارة. نُقدّر الفضول والمبادرة والعناية بالتفاصيل.",
        },
        { type: "h", text: "طلبات التوظيف التلقائية" },
        {
          type: "p",
          text: `لا تتوفّر لدينا دائمًا وظيفة شاغرة، لكننا نحبّ التعرّف على الموهوبين. أرسل سيرتك الذاتية إلى ${CONTACT.email} مع عنوان «وظائف».`,
        },
      ],
    },
  },

  blog: {
    fr: {
      title: "Le blog",
      subtitle: "Histoires d'artistes, coulisses et inspirations.",
      blocks: [
        {
          type: "p",
          text: "Notre blog arrive bientôt. Nous y partagerons des portraits d'artistes, les coulisses de nos collections et des idées pour porter vos créations préférées.",
        },
        {
          type: "p",
          text: `En attendant, suivez-nous sur les réseaux sociaux, ou écrivez-nous à ${CONTACT.email} pour être informé du lancement.`,
        },
      ],
    },
    en: {
      title: "The blog",
      subtitle: "Artist stories, behind the scenes and inspiration.",
      blocks: [
        {
          type: "p",
          text: "Our blog is coming soon. We'll share artist spotlights, behind-the-scenes of our collections, and ideas for styling your favorite designs.",
        },
        {
          type: "p",
          text: `In the meantime, follow us on social media, or email ${CONTACT.email} to hear when it launches.`,
        },
      ],
    },
    ar: {
      title: "المدوّنة",
      subtitle: "قصص الفنانين وكواليس العمل ومصادر الإلهام.",
      blocks: [
        {
          type: "p",
          text: "مدوّنتنا قادمة قريبًا. سنشارك فيها لمحات عن الفنانين وكواليس مجموعاتنا وأفكارًا لتنسيق تصاميمك المفضّلة.",
        },
        {
          type: "p",
          text: `في انتظار ذلك، تابعنا على وسائل التواصل الاجتماعي، أو راسلنا على ${CONTACT.email} لتعرف موعد الإطلاق.`,
        },
      ],
    },
  },

  press: {
    fr: {
      title: "Presse",
      subtitle: "Ressources et contact pour les médias.",
      blocks: [
        { type: "h", text: "À propos de BlueQuirk" },
        {
          type: "p",
          text: "BlueQuirk est une marque marocaine de mode et d'accessoires qui met en avant des créations d'artistes indépendants, avec livraison dans tout le Maroc et paiement à la livraison.",
        },
        { type: "h", text: "Contact presse" },
        {
          type: "p",
          text: `Pour toute demande média, interview ou kit presse, écrivez-nous à ${CONTACT.email} avec l'objet « Presse ».`,
        },
      ],
    },
    en: {
      title: "Press",
      subtitle: "Resources and contact for media.",
      blocks: [
        { type: "h", text: "About BlueQuirk" },
        {
          type: "p",
          text: "BlueQuirk is a Moroccan fashion and accessories brand showcasing designs from independent artists, with delivery across Morocco and cash on delivery.",
        },
        { type: "h", text: "Press contact" },
        {
          type: "p",
          text: `For any media request, interview or press kit, email us at ${CONTACT.email} with the subject "Press".`,
        },
      ],
    },
    ar: {
      title: "الصحافة",
      subtitle: "موارد ووسيلة تواصل لوسائل الإعلام.",
      blocks: [
        { type: "h", text: "عن BlueQuirk" },
        {
          type: "p",
          text: "BlueQuirk علامة مغربية للأزياء والإكسسوارات تُبرز إبداعات فنانين مستقلين، مع توصيل لكل أنحاء المغرب والدفع عند الاستلام.",
        },
        { type: "h", text: "التواصل الصحفي" },
        {
          type: "p",
          text: `لأي طلب إعلامي أو مقابلة أو ملف صحفي، راسلنا على ${CONTACT.email} مع عنوان «الصحافة».`,
        },
      ],
    },
  },

  privacy: {
    fr: {
      title: "Politique de confidentialité",
      subtitle: "Comment nous protégeons vos données personnelles.",
      blocks: [
        { type: "h", text: "Données que nous collectons" },
        {
          type: "p",
          text: "Nous collectons uniquement les informations nécessaires au traitement de vos commandes : nom, coordonnées, adresse de livraison et détails de commande. Nous n'utilisons pas de traceurs publicitaires tiers.",
        },
        { type: "h", text: "Utilisation des données" },
        {
          type: "ul",
          items: [
            "Traiter et livrer vos commandes.",
            "Vous contacter au sujet de votre commande.",
            "Améliorer notre boutique grâce à des statistiques anonymes.",
          ],
        },
        { type: "h", text: "Vos droits" },
        {
          type: "p",
          text: `Vous pouvez demander l'accès, la correction ou la suppression de vos données à tout moment en écrivant à ${CONTACT.email}. Nous ne vendons jamais vos données personnelles.`,
        },
      ],
    },
    en: {
      title: "Privacy policy",
      subtitle: "How we protect your personal data.",
      blocks: [
        { type: "h", text: "Data we collect" },
        {
          type: "p",
          text: "We only collect the information needed to process your orders: name, contact details, delivery address and order details. We don't use third-party advertising trackers.",
        },
        { type: "h", text: "How we use data" },
        {
          type: "ul",
          items: [
            "To process and deliver your orders.",
            "To contact you about your order.",
            "To improve our store through anonymous statistics.",
          ],
        },
        { type: "h", text: "Your rights" },
        {
          type: "p",
          text: `You can request access, correction or deletion of your data anytime by emailing ${CONTACT.email}. We never sell your personal data.`,
        },
      ],
    },
    ar: {
      title: "سياسة الخصوصية",
      subtitle: "كيف نحمي بياناتك الشخصية.",
      blocks: [
        { type: "h", text: "البيانات التي نجمعها" },
        {
          type: "p",
          text: "نجمع فقط المعلومات اللازمة لمعالجة طلباتك: الاسم ومعلومات التواصل وعنوان التوصيل وتفاصيل الطلب. لا نستخدم أدوات تتبّع إعلانية من جهات خارجية.",
        },
        { type: "h", text: "كيف نستخدم البيانات" },
        {
          type: "ul",
          items: [
            "معالجة طلباتك وتوصيلها.",
            "التواصل معك بخصوص طلبك.",
            "تحسين متجرنا عبر إحصاءات مجهولة الهوية.",
          ],
        },
        { type: "h", text: "حقوقك" },
        {
          type: "p",
          text: `يمكنك طلب الاطّلاع على بياناتك أو تصحيحها أو حذفها في أي وقت عبر مراسلتنا على ${CONTACT.email}. نحن لا نبيع بياناتك الشخصية أبدًا.`,
        },
      ],
    },
  },

  terms: {
    fr: {
      title: "Conditions générales",
      subtitle: "Les règles d'utilisation de notre boutique.",
      blocks: [
        { type: "h", text: "Commandes" },
        {
          type: "p",
          text: "En passant commande, vous confirmez que les informations fournies sont exactes. Toutes les commandes sont soumises à disponibilité et à confirmation par téléphone lorsque nécessaire.",
        },
        { type: "h", text: "Prix et paiement" },
        {
          type: "p",
          text: "Les prix sont indiqués en dirhams (DH), taxes comprises. Le paiement s'effectue à la livraison, en espèces, sauf indication contraire.",
        },
        { type: "h", text: "Propriété intellectuelle" },
        {
          type: "p",
          text: "Tous les designs restent la propriété de leurs artistes et de BlueQuirk. Toute reproduction non autorisée est interdite.",
        },
      ],
    },
    en: {
      title: "Terms & conditions",
      subtitle: "The rules for using our store.",
      blocks: [
        { type: "h", text: "Orders" },
        {
          type: "p",
          text: "By placing an order, you confirm that the information you provide is accurate. All orders are subject to availability and to phone confirmation when needed.",
        },
        { type: "h", text: "Prices & payment" },
        {
          type: "p",
          text: "Prices are shown in dirhams (DH), taxes included. Payment is made on delivery, in cash, unless stated otherwise.",
        },
        { type: "h", text: "Intellectual property" },
        {
          type: "p",
          text: "All designs remain the property of their artists and of BlueQuirk. Any unauthorized reproduction is prohibited.",
        },
      ],
    },
    ar: {
      title: "الشروط والأحكام",
      subtitle: "قواعد استخدام متجرنا.",
      blocks: [
        { type: "h", text: "الطلبات" },
        {
          type: "p",
          text: "بتقديمك طلبًا، تؤكّد أن المعلومات التي قدّمتها صحيحة. تخضع جميع الطلبات للتوفّر وللتأكيد الهاتفي عند الحاجة.",
        },
        { type: "h", text: "الأسعار والدفع" },
        {
          type: "p",
          text: "تُعرض الأسعار بالدرهم (DH) شاملةً الضرائب. يتمّ الدفع عند الاستلام نقدًا، ما لم يُذكر خلاف ذلك.",
        },
        { type: "h", text: "الملكية الفكرية" },
        {
          type: "p",
          text: "تبقى جميع التصاميم ملكًا لأصحابها من الفنانين ولـ BlueQuirk. يُمنع أي نسخ غير مصرّح به.",
        },
      ],
    },
  },

  cookies: {
    fr: {
      title: "Politique de cookies",
      subtitle: "Les cookies que nous utilisons et pourquoi.",
      blocks: [
        { type: "h", text: "Qu'est-ce qu'un cookie" },
        {
          type: "p",
          text: "Un cookie est un petit fichier stocké sur votre appareil qui aide le site à fonctionner et à mémoriser vos préférences, comme la langue choisie.",
        },
        { type: "h", text: "Cookies que nous utilisons" },
        {
          type: "ul",
          items: [
            "Cookies essentiels : panier, langue et session.",
            "Statistiques anonymes : pour comprendre l'usage du site, sans vous identifier.",
          ],
        },
        { type: "h", text: "Gérer les cookies" },
        {
          type: "p",
          text: "Vous pouvez à tout moment bloquer ou supprimer les cookies dans les réglages de votre navigateur. Certaines fonctionnalités du site pourraient alors être limitées.",
        },
      ],
    },
    en: {
      title: "Cookie policy",
      subtitle: "The cookies we use and why.",
      blocks: [
        { type: "h", text: "What is a cookie" },
        {
          type: "p",
          text: "A cookie is a small file stored on your device that helps the site work and remember your preferences, such as your chosen language.",
        },
        { type: "h", text: "Cookies we use" },
        {
          type: "ul",
          items: [
            "Essential cookies: cart, language and session.",
            "Anonymous analytics: to understand site usage, without identifying you.",
          ],
        },
        { type: "h", text: "Managing cookies" },
        {
          type: "p",
          text: "You can block or delete cookies anytime in your browser settings. Some site features may then be limited.",
        },
      ],
    },
    ar: {
      title: "سياسة ملفات تعريف الارتباط",
      subtitle: "ملفات تعريف الارتباط التي نستخدمها ولماذا.",
      blocks: [
        { type: "h", text: "ما هو ملفّ تعريف الارتباط" },
        {
          type: "p",
          text: "ملفّ تعريف الارتباط هو ملفّ صغير يُخزَّن على جهازك يساعد الموقع على العمل وتذكّر تفضيلاتك، مثل اللغة التي اخترتها.",
        },
        { type: "h", text: "الملفات التي نستخدمها" },
        {
          type: "ul",
          items: [
            "ملفات أساسية: السلة واللغة والجلسة.",
            "إحصاءات مجهولة الهوية: لفهم استخدام الموقع دون التعرّف عليك.",
          ],
        },
        { type: "h", text: "إدارة الملفات" },
        {
          type: "p",
          text: "يمكنك حظر ملفات تعريف الارتباط أو حذفها في أي وقت من إعدادات متصفّحك. قد تصبح بعض ميزات الموقع محدودة عندئذٍ.",
        },
      ],
    },
  },
};

export function getStaticPage(
  slug: string,
  lang: string
): StaticPageContent | null {
  if (!isStaticPageSlug(slug)) return null;
  const byLang = PAGES[slug];
  return byLang[(lang as LangCode)] ?? byLang.fr;
}
