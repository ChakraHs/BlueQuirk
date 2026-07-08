// Localized copy for the support widget (fr / en / ar), kept inside the module
// so the whole widget is a self-contained, drop-in feature. Mirrors the app's
// i18n approach (a dictionary per language). Store name is interpolated at
// render time via {store}.

import type { QuickAction, SuggestedQuestion } from "./types";

export interface SupportBundle {
  ui: {
    launcherLabel: string;
    title: string;
    online: string;
    replyTime: string;
    welcomeTitle: string;
    welcomeBody: string; // supports {store}
    quickTitle: string;
    suggestedTitle: string;
    searchPlaceholder: string;
    noResults: string;
    composerPlaceholder: string;
    send: string;
    close: string;
    back: string;
    typing: string;
    you: string;
    fallback: string;
  };
  quickActions: QuickAction[];
  suggested: SuggestedQuestion[];
  answers: Record<string, string>;
}

const fr: SupportBundle = {
  ui: {
    launcherLabel: "Ouvrir l'assistance",
    title: "Service client",
    online: "En ligne",
    replyTime: "Réponse en quelques minutes",
    welcomeTitle: "Bonjour 👋",
    welcomeBody: "Bienvenue chez {store} ! Comment pouvons-nous vous aider aujourd'hui ?",
    quickTitle: "Actions rapides",
    suggestedTitle: "Questions fréquentes",
    searchPlaceholder: "Rechercher un sujet d'aide…",
    noResults: "Aucun sujet ne correspond à votre recherche.",
    composerPlaceholder: "Écrivez votre message…",
    send: "Envoyer",
    close: "Fermer l'assistance",
    back: "Retour",
    typing: "en train d'écrire…",
    you: "Vous",
    fallback:
      "Merci pour votre message ! Un membre de notre équipe vous répondra très bientôt. En attendant, explorez les questions fréquentes ci-dessus.",
  },
  quickActions: [
    { id: "track", emoji: "📦", label: "Suivre ma commande", topic: "track_order" },
    { id: "shipping", emoji: "🚚", label: "Informations de livraison", topic: "shipping" },
    { id: "returns", emoji: "↩️", label: "Retours & remboursements", topic: "returns" },
    { id: "size", emoji: "📏", label: "Guide des tailles", topic: "size_guide" },
    { id: "payment", emoji: "💳", label: "Moyens de paiement", topic: "payment" },
    { id: "faq", emoji: "❓", label: "Questions fréquentes", topic: "faq" },
    { id: "promos", emoji: "🎁", label: "Promotions & réductions", topic: "promotions" },
    { id: "contact", emoji: "📞", label: "Contacter le support", topic: "contact" },
  ],
  suggested: [
    { id: "where", label: "Où est ma commande ?", topic: "track_order" },
    { id: "howlong", label: "Combien de temps pour la livraison ?", topic: "shipping" },
    { id: "exchange", label: "Puis-je échanger ma taille ?", topic: "returns" },
    { id: "returns", label: "Comment fonctionnent les retours ?", topic: "returns" },
    { id: "methods", label: "Quels moyens de paiement acceptez-vous ?", topic: "payment" },
    { id: "cod", label: "Le paiement à la livraison est-il possible ?", topic: "cod" },
  ],
  answers: {
    track_order:
      "Pour suivre votre commande, ouvrez « Compte → Mes commandes », ou utilisez le lien de suivi envoyé par e-mail. Communiquez-nous votre numéro de commande et nous vérifions son statut.",
    shipping:
      "Nous livrons partout au Maroc en 3 à 5 jours ouvrables. La livraison standard et express est proposée au moment du paiement.",
    returns:
      "Vous disposez de retours faciles sous 14 jours. Les articles doivent être non portés et dans leur état d'origine. Nous pouvons échanger une taille ou vous rembourser.",
    size_guide:
      "Chaque fiche produit inclut un guide des tailles détaillé, ainsi qu'un calculateur « Calculer ma taille » pour trouver la coupe idéale.",
    payment:
      "Nous acceptons le paiement à la livraison (espèces) partout au Maroc, ainsi que des méthodes de paiement sécurisées au checkout.",
    faq: "Vous trouverez nos réponses les plus fréquentes ici. Posez votre question et nous vous guidons.",
    promotions:
      "Des promotions et réductions sont régulièrement disponibles. Abonnez-vous à notre newsletter pour ne rien manquer.",
    contact:
      "Notre équipe est disponible 24/7. Écrivez-nous ici et nous revenons vers vous rapidement.",
    cod: "Oui — le paiement à la livraison en espèces est disponible dans tout le Maroc. Vous payez à la réception de votre colis.",
  },
};

const en: SupportBundle = {
  ui: {
    launcherLabel: "Open support",
    title: "Customer Support",
    online: "Online",
    replyTime: "Replies in a few minutes",
    welcomeTitle: "Hi 👋",
    welcomeBody: "Welcome to {store}! How can we help you today?",
    quickTitle: "Quick actions",
    suggestedTitle: "Popular questions",
    searchPlaceholder: "Search help topics…",
    noResults: "No topics match your search.",
    composerPlaceholder: "Type your message…",
    send: "Send",
    close: "Close support",
    back: "Back",
    typing: "typing…",
    you: "You",
    fallback:
      "Thanks for your message! A member of our team will get back to you shortly. In the meantime, take a look at the popular questions above.",
  },
  quickActions: [
    { id: "track", emoji: "📦", label: "Track my order", topic: "track_order" },
    { id: "shipping", emoji: "🚚", label: "Shipping information", topic: "shipping" },
    { id: "returns", emoji: "↩️", label: "Returns & Refunds", topic: "returns" },
    { id: "size", emoji: "📏", label: "Size Guide", topic: "size_guide" },
    { id: "payment", emoji: "💳", label: "Payment methods", topic: "payment" },
    { id: "faq", emoji: "❓", label: "Frequently Asked Questions", topic: "faq" },
    { id: "promos", emoji: "🎁", label: "Promotions & Discounts", topic: "promotions" },
    { id: "contact", emoji: "📞", label: "Contact Support", topic: "contact" },
  ],
  suggested: [
    { id: "where", label: "Where is my order?", topic: "track_order" },
    { id: "howlong", label: "How long is shipping?", topic: "shipping" },
    { id: "exchange", label: "Can I exchange my size?", topic: "returns" },
    { id: "returns", label: "How do returns work?", topic: "returns" },
    { id: "methods", label: "What payment methods do you accept?", topic: "payment" },
    { id: "cod", label: "Is cash on delivery available?", topic: "cod" },
  ],
  answers: {
    track_order:
      "To track your order, open “Account → My orders”, or use the tracking link from your confirmation email. Share your order number and we'll check its status.",
    shipping:
      "We deliver anywhere in Morocco within 3–5 business days. Standard and express shipping are offered at checkout.",
    returns:
      "We offer easy 14-day returns. Items must be unworn and in their original condition. We can exchange a size or issue a refund.",
    size_guide:
      "Every product page includes a detailed size guide, plus a “Calculate my size” helper to find your perfect fit.",
    payment:
      "We accept cash on delivery anywhere in Morocco, along with secure payment methods at checkout.",
    faq: "You'll find our most common answers here. Ask your question and we'll guide you.",
    promotions:
      "We run promotions and discounts regularly. Subscribe to our newsletter so you never miss one.",
    contact:
      "Our team is available 24/7. Message us here and we'll get back to you quickly.",
    cod: "Yes — cash on delivery is available across Morocco. You pay when your parcel arrives.",
  },
};

const ar: SupportBundle = {
  ui: {
    launcherLabel: "فتح الدعم",
    title: "خدمة العملاء",
    online: "متصل",
    replyTime: "الرد خلال دقائق",
    welcomeTitle: "مرحبًا 👋",
    welcomeBody: "أهلًا بك في {store}! كيف يمكننا مساعدتك اليوم؟",
    quickTitle: "إجراءات سريعة",
    suggestedTitle: "أسئلة شائعة",
    searchPlaceholder: "ابحث في مواضيع المساعدة…",
    noResults: "لا توجد مواضيع مطابقة لبحثك.",
    composerPlaceholder: "اكتب رسالتك…",
    send: "إرسال",
    close: "إغلاق الدعم",
    back: "رجوع",
    typing: "يكتب…",
    you: "أنت",
    fallback:
      "شكرًا على رسالتك! سيتواصل معك أحد أفراد فريقنا قريبًا. في هذه الأثناء، ألقِ نظرة على الأسئلة الشائعة أعلاه.",
  },
  quickActions: [
    { id: "track", emoji: "📦", label: "تتبّع طلبي", topic: "track_order" },
    { id: "shipping", emoji: "🚚", label: "معلومات الشحن", topic: "shipping" },
    { id: "returns", emoji: "↩️", label: "الإرجاع والاسترداد", topic: "returns" },
    { id: "size", emoji: "📏", label: "دليل المقاسات", topic: "size_guide" },
    { id: "payment", emoji: "💳", label: "طرق الدفع", topic: "payment" },
    { id: "faq", emoji: "❓", label: "الأسئلة الشائعة", topic: "faq" },
    { id: "promos", emoji: "🎁", label: "العروض والتخفيضات", topic: "promotions" },
    { id: "contact", emoji: "📞", label: "التواصل مع الدعم", topic: "contact" },
  ],
  suggested: [
    { id: "where", label: "أين طلبي؟", topic: "track_order" },
    { id: "howlong", label: "كم يستغرق الشحن؟", topic: "shipping" },
    { id: "exchange", label: "هل يمكنني تبديل المقاس؟", topic: "returns" },
    { id: "returns", label: "كيف يعمل الإرجاع؟", topic: "returns" },
    { id: "methods", label: "ما طرق الدفع التي تقبلونها؟", topic: "payment" },
    { id: "cod", label: "هل الدفع عند الاستلام متاح؟", topic: "cod" },
  ],
  answers: {
    track_order:
      "لتتبّع طلبك، افتح «الحساب ← طلباتي»، أو استخدم رابط التتبّع من بريد التأكيد. شاركنا رقم طلبك وسنتحقق من حالته.",
    shipping:
      "نوصّل إلى أي مكان في المغرب خلال 3 إلى 5 أيام عمل. يتوفّر الشحن العادي والسريع عند الدفع.",
    returns:
      "نوفّر إرجاعًا سهلًا خلال 14 يومًا. يجب أن تكون المنتجات غير مستعملة وبحالتها الأصلية. يمكننا تبديل المقاس أو رد المبلغ.",
    size_guide:
      "تتضمّن كل صفحة منتج دليل مقاسات مفصّلًا، بالإضافة إلى أداة «احسب مقاسي» لإيجاد المقاس المناسب.",
    payment:
      "نقبل الدفع عند الاستلام (نقدًا) في جميع أنحاء المغرب، إلى جانب وسائل دفع آمنة عند الدفع.",
    faq: "ستجد هنا أكثر إجاباتنا شيوعًا. اطرح سؤالك وسنرشدك.",
    promotions:
      "نقدّم عروضًا وتخفيضات بانتظام. اشترك في نشرتنا البريدية حتى لا تفوّت أيًّا منها.",
    contact: "فريقنا متاح 24/7. راسلنا هنا وسنعاود التواصل معك بسرعة.",
    cod: "نعم — الدفع عند الاستلام متاح في جميع أنحاء المغرب. تدفع عند وصول طردك.",
  },
};

const BUNDLES: Record<string, SupportBundle> = { fr, en, ar };

export function getSupportStrings(lang: string): SupportBundle {
  return BUNDLES[lang] ?? BUNDLES.fr;
}
