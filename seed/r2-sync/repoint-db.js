// Repoint ONLY — no upload. Rewrites the DB so product images and category
// tiles point at the R2 public URLs, assuming the objects are already in the
// bucket (uploaded previously or out-of-band). Use this when the images are
// already in R2 and you just need the DB to reference them.
//
//   node repoint-db.js
//
// Idempotent. Reads R2_PUBLIC_BASE + DB_* from .env.
import "dotenv/config";
import mysql from "mysql2/promise";

const KEY_PREFIX = "catalog";

const required = ["R2_PUBLIC_BASE"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}.`);
  process.exit(1);
}

const PUBLIC_BASE = process.env.R2_PUBLIC_BASE.replace(/\/+$/, "");
const publicUrl = (file) => `${PUBLIC_BASE}/${KEY_PREFIX}/${file}`;

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Product images: images.url -> R2 url, matched by the stored file_name.
const [imgRows] = await db.execute("SELECT id, file_name FROM images WHERE file_name IS NOT NULL");
let imgUpdated = 0;
for (const row of imgRows) {
  const [res] = await db.execute("UPDATE images SET url = ? WHERE id = ?", [publicUrl(row.file_name), row.id]);
  imgUpdated += res.affectedRows;
}

// Category tiles: categories.image_url -> R2 url (cat-<id>.jpg).
const [catRows] = await db.execute("SELECT id FROM categories");
let catUpdated = 0;
for (const row of catRows) {
  const [res] = await db.execute("UPDATE categories SET image_url = ? WHERE id = ?", [publicUrl(`cat-${row.id}.jpg`), row.id]);
  catUpdated += res.affectedRows;
}

// Show a couple of sample URLs so the result is easy to eyeball.
const [sample] = await db.execute("SELECT url FROM images WHERE file_name IS NOT NULL ORDER BY id LIMIT 3");
await db.end();

console.log(`Repointed ${imgUpdated} product images and ${catUpdated} category tiles to R2.`);
console.log("Sample image URLs:");
for (const r of sample) console.log("  " + r.url);
