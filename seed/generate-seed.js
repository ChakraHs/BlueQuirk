/*
 * BlueQuirk catalog seed generator.
 * Emits deterministic SQL (explicit IDs) for a coherent clothes-store dataset:
 * attributes + values, hierarchical categories (+fr/ar translations),
 * products (+fr/ar translations), and all the join tables
 * (product_attribute_values, product_categories, product_images).
 *
 * Run: node generate-seed.js > seed.sql
 */

const q = (s) => (s === null || s === undefined ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);

/* ----------------------------- Attributes ----------------------------- */
// type: COLOR | SIZE | TEXT
const attributes = [
  { id: 1, name: "Color", type: "COLOR", values: [
    { id: 1, value: "Black" }, { id: 2, value: "White" }, { id: 3, value: "Navy" },
    { id: 4, value: "Red" }, { id: 5, value: "Royal Blue" }, { id: 6, value: "Forest Green" },
    { id: 7, value: "Heather Grey" }, { id: 8, value: "Maroon" }, { id: 9, value: "Pink" },
    { id: 10, value: "Mustard" },
  ]},
  { id: 2, name: "Size", type: "SIZE", values: [
    { id: 11, value: "XS" }, { id: 12, value: "S" }, { id: 13, value: "M" },
    { id: 14, value: "L" }, { id: 15, value: "XL" }, { id: 16, value: "XXL" },
  ]},
  { id: 3, name: "Material", type: "TEXT", values: [
    { id: 17, value: "Cotton" }, { id: 18, value: "Organic Cotton" }, { id: 19, value: "Polyester Blend" },
    { id: 20, value: "Heavyweight Fleece" }, { id: 21, value: "Tri-Blend" },
  ]},
];

// Convenience maps value-name -> id
const V = {};
attributes.forEach((a) => a.values.forEach((v) => (V[v.value] = v.id)));

/* ----------------------------- Categories ----------------------------- */
const CT = "https://images.ctfassets.net";
const categories = [
  { id: 1, name: "T-Shirts", slug: "t-shirts", parent: null,
    img: `${CT}/5hig0ukq7ib0/bUmu6RBCWC5TTscquxd16/041978fd5b8a89923e2bcf646f24c71c/2352468_LocalizationUpdates40offPromo_800x800_1_081824.jpg?fm=jpg&q=85&w=800&fl=progressive`,
    desc: "Soft, durable tees printed with original artwork.",
    fr: { name: "T-Shirts", desc: "Des t-shirts doux et durables imprimés avec des illustrations originales." },
    ar: { name: "تيشيرتات", desc: "تيشيرتات ناعمة ومتينة مطبوعة برسومات أصلية." } },

  { id: 2, name: "Men's T-Shirts", slug: "mens-t-shirts", parent: 1,
    img: `${CT}/40akseett7bn/73ollBaFMKWqecCWhoz9Xr/ba927273e4e832ea4690b1c7b5e8038a/25Q1_GM_OnSite_LP_T-Shirts_Tile-Mens.png`,
    desc: "Everyday tees with a classic men's fit.",
    fr: { name: "T-Shirts Homme", desc: "Des t-shirts au tombé classique pour homme." },
    ar: { name: "تيشيرتات رجالية", desc: "تيشيرتات بقصة كلاسيكية للرجال." } },

  { id: 3, name: "Women's T-Shirts", slug: "womens-t-shirts", parent: 1,
    img: `${CT}/40akseett7bn/7t0jPmroHvSxZRSLzN9x4z/3b47dd57877ab4231db4953f183a0084/25Q1_GM_OnSite_LP_T-Shirts_Tile-Womens.png`,
    desc: "Flattering tees designed for a women's fit.",
    fr: { name: "T-Shirts Femme", desc: "Des t-shirts à la coupe féminine." },
    ar: { name: "تيشيرتات نسائية", desc: "تيشيرتات بقصة أنثوية." } },

  { id: 4, name: "Unisex T-Shirts", slug: "unisex-t-shirts", parent: 1,
    img: `${CT}/40akseett7bn/1mO3vTNNj4oiB1VIrjAOv6/6ddaa3cdae508a78003ddc7691bef694/25Q1_GM_OnSite_LP_T-Shirts_Tile-UnisexTee.png`,
    desc: "A relaxed unisex cut that suits everyone.",
    fr: { name: "T-Shirts Unisexe", desc: "Une coupe unisexe décontractée pour tous." },
    ar: { name: "تيشيرتات للجنسين", desc: "قصة فضفاضة تناسب الجميع." } },

  { id: 5, name: "Kids T-Shirts", slug: "kids-t-shirts", parent: 1,
    img: `${CT}/40akseett7bn/7IYojACCtCmQCfr358JzX3/4031fef01f0712019f5bde3b75743f83/23Q418_GM_UnholidizetheSite_MktgTeam_Incentives_KidsTshirts.png`,
    desc: "Playful, comfy tees made for kids.",
    fr: { name: "T-Shirts Enfant", desc: "Des t-shirts confortables et amusants pour enfants." },
    ar: { name: "تيشيرتات للأطفال", desc: "تيشيرتات مريحة وممتعة للأطفال." } },

  { id: 6, name: "Hoodies & Sweatshirts", slug: "hoodies", parent: null,
    img: "https://picsum.photos/seed/bq-cat-hoodies/800/800",
    desc: "Cozy hoodies and sweatshirts for cooler days.",
    fr: { name: "Sweats à Capuche", desc: "Des sweats douillets pour les jours frais." },
    ar: { name: "سويتشيرتات", desc: "سويتشيرتات دافئة للأيام الباردة." } },

  { id: 7, name: "Caps & Hats", slug: "caps", parent: null,
    img: "https://picsum.photos/seed/bq-cat-caps/800/800",
    desc: "Finish the look with an embroidered cap.",
    fr: { name: "Casquettes", desc: "Complétez votre look avec une casquette brodée." },
    ar: { name: "قبعات", desc: "أكمل إطلالتك بقبعة مطرزة." } },

  { id: 8, name: "Stickers", slug: "stickers", parent: null,
    img: `${CT}/5hig0ukq7ib0/4P0QEmFR6brUSmVEZNaKBm/9af6b7feae6e2ae43f9cce391929095b/25Q302_GM-Sept_40_SW_Onsite_HomepageTile_Desktop_2025_Stickers_NB.png?fm=jpg&q=85&w=800&fl=progressive`,
    desc: "Durable, weatherproof vinyl stickers.",
    fr: { name: "Autocollants", desc: "Des autocollants en vinyle résistants aux intempéries." },
    ar: { name: "ملصقات", desc: "ملصقات فينيل متينة ومقاومة للعوامل الجوية." } },

  { id: 9, name: "Phone Cases", slug: "phone-cases", parent: null,
    img: `${CT}/5hig0ukq7ib0/4zt0wgjprgqtOeGs1PsSE4/db62e5b9cc5f82ef6777efcf26e1a6d9/24Q402_GM_Holiday-NJaG_Homepage-Desktop_Tile-Phone_Cases.png?fm=jpg&q=85&w=800&fl=progressive`,
    desc: "Slim, protective cases with bold prints.",
    fr: { name: "Coques de Téléphone", desc: "Des coques fines et protectrices aux imprimés audacieux." },
    ar: { name: "أغطية الهاتف", desc: "أغطية رفيعة وواقية بطبعات جريئة." } },

  { id: 10, name: "Tote Bags", slug: "tote-bags", parent: null,
    img: "https://picsum.photos/seed/bq-cat-totes/800/800",
    desc: "Sturdy cotton totes for everyday carry.",
    fr: { name: "Tote Bags", desc: "Des sacs en coton robustes pour tous les jours." },
    ar: { name: "حقائب قماشية", desc: "حقائب قطنية متينة للاستخدام اليومي." } },
];

/* ------------------------------ Products ------------------------------ */
const img = (seed) => `https://picsum.photos/seed/${seed}/800/800`;
const desc = (html) => `<p>${html}</p>`;

const products = [
  { id: 1, name: "Cosmic Otter Tee", price: 24.90, cats: [4],
    colors: ["Black", "White", "Navy", "Heather Grey"], sizes: ["S","M","L","XL","XXL"], material: ["Organic Cotton"],
    seeds: ["bq-p1a","bq-p1b"],
    desc: "An otter drifting through the stars — printed edge to edge on a buttery-soft organic cotton tee.",
    fr: { name: "T-Shirt Loutre Cosmique", desc: "Une loutre dérivant parmi les étoiles, imprimée sur un t-shirt en coton bio ultra-doux." },
    ar: { name: "تيشيرت القندس الكوني", desc: "قندس ينجرف بين النجوم، مطبوع على تيشيرت من القطن العضوي الناعم." } },

  { id: 2, name: "Weirdly Meaningful Tee", price: 22.50, cats: [4],
    colors: ["White", "Heather Grey", "Pink"], sizes: ["XS","S","M","L","XL"], material: ["Cotton"],
    seeds: ["bq-p2a"],
    desc: "A little weird, a lot meaningful. Our signature slogan tee for the quietly bold.",
    fr: { name: "T-Shirt Étrangement Significatif", desc: "Un peu étrange, très significatif. Notre t-shirt à slogan emblématique." },
    ar: { name: "تيشيرت ذو معنى غريب", desc: "غريب قليلاً، وذو معنى كبير. تيشيرت الشعار المميز لدينا." } },

  { id: 3, name: "Midnight Fox Men's Tee", price: 23.00, cats: [2],
    colors: ["Black", "Navy", "Forest Green"], sizes: ["M","L","XL","XXL"], material: ["Cotton"],
    seeds: ["bq-p3a","bq-p3b"],
    desc: "A sly fox under a midnight sky, screen-printed on a classic-fit cotton tee.",
    fr: { name: "T-Shirt Renard de Minuit (Homme)", desc: "Un renard rusé sous un ciel de minuit, sérigraphié sur un t-shirt en coton." },
    ar: { name: "تيشيرت ثعلب منتصف الليل (رجالي)", desc: "ثعلب ماكر تحت سماء منتصف الليل، مطبوع على تيشيرت قطني كلاسيكي." } },

  { id: 4, name: "Retro Sunset Men's Tee", price: 25.00, cats: [2],
    colors: ["Mustard", "Maroon", "Black"], sizes: ["S","M","L","XL"], material: ["Tri-Blend"],
    seeds: ["bq-p4a"],
    desc: "Warm 70s gradients and clean lines — a retro sunset you can wear all year.",
    fr: { name: "T-Shirt Coucher de Soleil Rétro (Homme)", desc: "Des dégradés chaleureux des années 70 sur un t-shirt à porter toute l'année." },
    ar: { name: "تيشيرت غروب الشمس الكلاسيكي (رجالي)", desc: "تدرجات دافئة من السبعينيات على تيشيرت يمكن ارتداؤه طوال العام." } },

  { id: 5, name: "Blossom Women's Tee", price: 23.50, cats: [3],
    colors: ["Pink", "White", "Heather Grey"], sizes: ["XS","S","M","L"], material: ["Organic Cotton"],
    seeds: ["bq-p5a","bq-p5b"],
    desc: "Hand-drawn blossoms on a flattering women's-fit tee. Soft, breathable, and made to layer.",
    fr: { name: "T-Shirt Floraison (Femme)", desc: "Des fleurs dessinées à la main sur un t-shirt à coupe féminine, doux et respirant." },
    ar: { name: "تيشيرت الإزهار (نسائي)", desc: "أزهار مرسومة يدويًا على تيشيرت نسائي ناعم وقابل للتنفس." } },

  { id: 6, name: "Wildflower Women's Tee", price: 24.00, cats: [3],
    colors: ["White", "Mustard", "Forest Green"], sizes: ["XS","S","M","L","XL"], material: ["Cotton"],
    seeds: ["bq-p6a"],
    desc: "A meadow of wildflowers wrapping around a relaxed women's tee.",
    fr: { name: "T-Shirt Fleurs Sauvages (Femme)", desc: "Une prairie de fleurs sauvages sur un t-shirt femme décontracté." },
    ar: { name: "تيشيرت الزهور البرية (نسائي)", desc: "مرج من الزهور البرية على تيشيرت نسائي مريح." } },

  { id: 7, name: "Tiny Dino Kids Tee", price: 18.00, cats: [5],
    colors: ["Royal Blue", "Red", "Mustard"], sizes: ["XS","S","M"], material: ["Cotton"],
    seeds: ["bq-p7a"],
    desc: "A friendly little dino for little explorers. Tough enough for the playground.",
    fr: { name: "T-Shirt Petit Dino (Enfant)", desc: "Un petit dino sympathique pour les petits explorateurs." },
    ar: { name: "تيشيرت الديناصور الصغير (أطفال)", desc: "ديناصور صغير لطيف للمستكشفين الصغار." } },

  { id: 8, name: "Space Cadet Kids Tee", price: 18.50, cats: [5],
    colors: ["Navy", "Black", "Red"], sizes: ["XS","S","M"], material: ["Cotton"],
    seeds: ["bq-p8a"],
    desc: "Blast-off ready. A rocket and stars print for future astronauts.",
    fr: { name: "T-Shirt Cadet de l'Espace (Enfant)", desc: "Prêt pour le décollage : une fusée et des étoiles pour futurs astronautes." },
    ar: { name: "تيشيرت رائد الفضاء (أطفال)", desc: "جاهز للانطلاق: طبعة صاروخ ونجوم لرواد الفضاء المستقبليين." } },

  { id: 9, name: "Classic Logo Unisex Tee", price: 21.00, cats: [4],
    colors: ["Black", "White", "Navy", "Heather Grey", "Maroon"], sizes: ["S","M","L","XL","XXL"], material: ["Tri-Blend"],
    seeds: ["bq-p9a","bq-p9b"],
    desc: "The BlueQuirk staple: our clean logo on a versatile tri-blend tee.",
    fr: { name: "T-Shirt Logo Classique (Unisexe)", desc: "L'incontournable BlueQuirk : notre logo épuré sur un t-shirt tri-blend." },
    ar: { name: "تيشيرت الشعار الكلاسيكي (للجنسين)", desc: "أساسي من BlueQuirk: شعارنا الأنيق على تيشيرت متعدد الاستخدامات." } },

  { id: 10, name: "Blue Snowflake Hoodie", price: 49.00, cats: [6],
    colors: ["Royal Blue", "Navy", "Black"], sizes: ["S","M","L","XL","XXL"], material: ["Heavyweight Fleece"],
    seeds: ["bq-p10a","bq-p10b"],
    desc: "A crisp snowflake on a heavyweight fleece hoodie with a roomy front pocket.",
    fr: { name: "Sweat à Capuche Flocon Bleu", desc: "Un flocon net sur un sweat à capuche en molleton épais avec poche kangourou." },
    ar: { name: "سويتشيرت ندفة الثلج الزرقاء", desc: "ندفة ثلج أنيقة على سويتشيرت من الصوف الثقيل بجيب أمامي واسع." } },

  { id: 11, name: "Cozy Bear Pullover Hoodie", price: 52.00, cats: [6],
    colors: ["Heather Grey", "Forest Green", "Maroon"], sizes: ["M","L","XL","XXL"], material: ["Heavyweight Fleece"],
    seeds: ["bq-p11a"],
    desc: "A sleepy bear and the softest brushed-back fleece you'll want to live in.",
    fr: { name: "Sweat à Capuche Ours Douillet", desc: "Un ours endormi et un molleton gratté ultra-doux." },
    ar: { name: "سويتشيرت الدب المريح", desc: "دب نعسان وصوف ناعم للغاية لن ترغب في خلعه." } },

  { id: 12, name: "Street Art Zip Hoodie", price: 56.00, cats: [6],
    colors: ["Black", "Navy"], sizes: ["S","M","L","XL"], material: ["Polyester Blend"],
    seeds: ["bq-p12a","bq-p12b"],
    desc: "Bold street-art graphics on a full-zip hoodie built for everyday wear.",
    fr: { name: "Sweat Zippé Street Art", desc: "Des graphismes street-art audacieux sur un sweat à capuche zippé." },
    ar: { name: "سويتشيرت بسحاب فن الشارع", desc: "رسومات جريئة من فن الشارع على سويتشيرت بسحاب كامل." } },

  { id: 13, name: "Minimal Black Cap", price: 19.00, cats: [7],
    colors: ["Black", "Navy", "Forest Green"], sizes: [], material: [],
    seeds: ["bq-p13a"],
    desc: "A clean, low-profile cap with an adjustable strap. One size fits most.",
    fr: { name: "Casquette Noire Minimaliste", desc: "Une casquette épurée et réglable. Taille unique." },
    ar: { name: "قبعة سوداء بسيطة", desc: "قبعة أنيقة قابلة للتعديل بمقاس واحد يناسب الجميع." } },

  { id: 14, name: "Embroidered Wave Dad Hat", price: 21.00, cats: [7],
    colors: ["Navy", "Maroon", "Heather Grey"], sizes: [], material: [],
    seeds: ["bq-p14a"],
    desc: "A tiny embroidered wave on a relaxed, curved-brim dad hat.",
    fr: { name: "Casquette Vague Brodée", desc: "Une petite vague brodée sur une casquette à visière courbée." },
    ar: { name: "قبعة الموجة المطرزة", desc: "موجة صغيرة مطرزة على قبعة بحافة منحنية." } },

  { id: 15, name: "Holographic Otter Sticker Pack", price: 8.50, cats: [8],
    colors: [], sizes: [], material: [],
    seeds: ["bq-p15a"],
    desc: "A pack of five weatherproof holographic stickers. Perfect for laptops and bottles.",
    fr: { name: "Pack d'Autocollants Loutre Holographique", desc: "Un lot de cinq autocollants holographiques résistants aux intempéries." },
    ar: { name: "حزمة ملصقات القندس الهولوغرافية", desc: "مجموعة من خمسة ملصقات هولوغرافية مقاومة للعوامل الجوية." } },

  { id: 16, name: "Meaningful Doodles Sticker Sheet", price: 7.00, cats: [8],
    colors: [], sizes: [], material: [],
    seeds: ["bq-p16a"],
    desc: "One sheet, a dozen tiny doodles. Kiss-cut and easy to peel.",
    fr: { name: "Planche d'Autocollants Doodles", desc: "Une planche, une douzaine de petits doodles faciles à décoller." },
    ar: { name: "ورقة ملصقات الرسومات", desc: "ورقة واحدة بعشرات الرسومات الصغيرة سهلة النزع." } },

  { id: 17, name: "Galaxy Drip Phone Case", price: 16.00, cats: [9],
    colors: ["Black", "White", "Royal Blue"], sizes: [], material: ["Polyester Blend"],
    seeds: ["bq-p17a"],
    desc: "A dripping galaxy print on a slim, shock-absorbing case.",
    fr: { name: "Coque Galaxy Drip", desc: "Un imprimé galaxie sur une coque fine et antichoc." },
    ar: { name: "غطاء هاتف المجرة المتقطرة", desc: "طبعة مجرة على غطاء رفيع ممتص للصدمات." } },

  { id: 18, name: "Canvas Everyday Tote", price: 14.00, cats: [10],
    colors: ["White", "Black"], sizes: [], material: ["Organic Cotton"],
    seeds: ["bq-p18a"],
    desc: "A sturdy organic-cotton tote with long handles and a printed motif.",
    fr: { name: "Tote Bag en Toile", desc: "Un tote bag en coton bio robuste avec de longues anses." },
    ar: { name: "حقيبة قماشية يومية", desc: "حقيبة من القطن العضوي المتين بمقابض طويلة." } },
];

/* ------------------------------- Emit SQL ------------------------------ */
const out = [];
out.push("SET FOREIGN_KEY_CHECKS = 0;");
// Wipe catalog (leave users / orders / email tables alone).
[
  "product_attribute_values", "product_categories", "product_images",
  "product_translations", "category_translations",
  "attribute_values", "attributes", "products", "images", "categories",
].forEach((t) => out.push(`DELETE FROM ${t};`));

// Attributes + values
attributes.forEach((a) => {
  out.push(`INSERT INTO attributes (id, name, type) VALUES (${a.id}, ${q(a.name)}, ${q(a.type)});`);
  a.values.forEach((v) =>
    out.push(`INSERT INTO attribute_values (id, value, attribute_id) VALUES (${v.id}, ${q(v.value)}, ${a.id});`)
  );
});

// Categories + translations
categories.forEach((c) => {
  out.push(`INSERT INTO categories (id, name, slug, description, parent_id, image_url) VALUES (${c.id}, ${q(c.name)}, ${q(c.slug)}, ${q(c.desc)}, ${c.parent === null ? "NULL" : c.parent}, ${q(c.img)});`);
});
let ctId = 1;
categories.forEach((c) => {
  [["fr", c.fr], ["ar", c.ar]].forEach(([lang, t]) => {
    out.push(`INSERT INTO category_translations (id, category_id, lang, name, description) VALUES (${ctId++}, ${c.id}, ${q(lang)}, ${q(t.name)}, ${q(t.desc)});`);
  });
});

// Products + translations + joins
let imgId = 1;
let ptId = 1;
products.forEach((p) => {
  out.push(`INSERT INTO products (id, name, description, price, status) VALUES (${p.id}, ${q(p.name)}, ${q(desc(p.desc))}, ${p.price}, 'PUBLISHED');`);

  // translations
  [["fr", p.fr], ["ar", p.ar]].forEach(([lang, t]) => {
    out.push(`INSERT INTO product_translations (id, product_id, lang, name, description) VALUES (${ptId++}, ${p.id}, ${q(lang)}, ${q(t.name)}, ${q(desc(t.desc))});`);
  });

  // images
  p.seeds.forEach((seed) => {
    out.push(`INSERT INTO images (id, file_name, url) VALUES (${imgId}, ${q(seed + ".jpg")}, ${q(img(seed))});`);
    out.push(`INSERT INTO product_images (product_id, image_id) VALUES (${p.id}, ${imgId});`);
    imgId++;
  });

  // categories
  p.cats.forEach((cid) =>
    out.push(`INSERT INTO product_categories (product_id, category_id) VALUES (${p.id}, ${cid});`)
  );

  // selected attribute values
  const valueIds = [
    ...p.colors.map((c) => V[c]),
    ...p.sizes.map((s) => V[s]),
    ...(p.material || []).map((m) => V[m]),
  ];
  valueIds.forEach((vid) => {
    if (!vid) throw new Error(`Unknown attribute value in product ${p.id}`);
    out.push(`INSERT INTO product_attribute_values (product_id, attribute_value_id) VALUES (${p.id}, ${vid});`);
  });
});

// Bump auto-increments past explicit IDs
out.push(`ALTER TABLE attributes AUTO_INCREMENT = 100;`);
out.push(`ALTER TABLE attribute_values AUTO_INCREMENT = 100;`);
out.push(`ALTER TABLE categories AUTO_INCREMENT = 100;`);
out.push(`ALTER TABLE category_translations AUTO_INCREMENT = 100;`);
out.push(`ALTER TABLE products AUTO_INCREMENT = 100;`);
out.push(`ALTER TABLE product_translations AUTO_INCREMENT = 100;`);
out.push(`ALTER TABLE images AUTO_INCREMENT = 100;`);
out.push("SET FOREIGN_KEY_CHECKS = 1;");

process.stdout.write(out.join("\n") + "\n");
