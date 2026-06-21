// Same job as sync.js (upload ../images/*.jpg to R2, then repoint the DB), but
// uploads through the Cloudflare REST API host (api.cloudflare.com) instead of
// the S3 endpoint (<account>.r2.cloudflarestorage.com).
//
// Why: some networks do SNI-based filtering that blocks the account-prefixed
// R2 S3 endpoint (TLS handshake_failure / alert 40) while leaving
// api.cloudflare.com reachable. This variant goes through the unfiltered host.
//
//   1. cp .env.example .env  &&  fill in CLOUDFLARE_API_TOKEN (+ the others)
//   2. npm install
//   3. npm run sync:api
//
// The API token must be a Cloudflare API token (NOT the S3 access key/secret)
// with the "Workers R2 Storage : Edit" permission. Object Read/Write S3 keys do
// not authenticate against the REST API.
//
// Idempotent: re-running overwrites the same objects and re-points the same rows.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, "..", "images");
const KEY_PREFIX = "catalog";

const required = ["R2_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "R2_BUCKET", "R2_PUBLIC_BASE"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}. Copy .env.example to .env and fill them in.`);
  process.exit(1);
}

const PUBLIC_BASE = process.env.R2_PUBLIC_BASE.replace(/\/+$/, "");
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const BUCKET = process.env.R2_BUCKET;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const publicUrl = (file) => `${PUBLIC_BASE}/${KEY_PREFIX}/${file}`;

const contentTypeFor = (file) => {
  const lower = file.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

// PUT a single object via the Cloudflare REST API. The object key may contain
// "/" path separators; encode each segment so the prefix slash is preserved.
async function putObject(key, body, contentType) {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodedKey}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PUT ${key} -> HTTP ${res.status} ${res.statusText} ${text}`.trim());
  }
}

async function uploadAll() {
  const files = readdirSync(IMAGES_DIR).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  if (!files.length) throw new Error(`No images found in ${IMAGES_DIR}`);

  console.log(`Uploading ${files.length} images to r2://${BUCKET}/${KEY_PREFIX}/ via Cloudflare API ...`);
  for (const file of files) {
    const body = readFileSync(join(IMAGES_DIR, file));
    await putObject(`${KEY_PREFIX}/${file}`, body, contentTypeFor(file));
    process.stdout.write(`  ✓ ${file}\n`);
  }
  return files;
}

async function repointDb() {
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

  await db.end();
  console.log(`Repointed ${imgUpdated} product images and ${catUpdated} category tiles to R2.`);
}

(async () => {
  await uploadAll();
  await repointDb();
  console.log(`\nDone. Public base: ${PUBLIC_BASE}`);
  console.log(`Make sure this host is in next.config.ts remotePatterns: ${new URL(PUBLIC_BASE).hostname}`);
})().catch((err) => {
  console.error("\nSync failed:", err.message);
  process.exit(1);
});
