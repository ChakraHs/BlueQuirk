// Uploads BlueQuirk catalog images (../images/*.jpg) to Cloudflare R2, then
// rewrites the DB so products and categories point at the R2 public URLs.
//
//   1. cp .env.example .env  &&  fill in the R2 values
//   2. npm install
//   3. npm run sync
//
// Idempotent: re-running re-uploads (overwrite) and re-points the same rows.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, "..", "images");
const KEY_PREFIX = "catalog";

const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}. Copy .env.example to .env and fill them in.`);
  process.exit(1);
}

const PUBLIC_BASE = process.env.R2_PUBLIC_BASE.replace(/\/+$/, "");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const publicUrl = (file) => `${PUBLIC_BASE}/${KEY_PREFIX}/${file}`;

async function uploadAll() {
  const files = readdirSync(IMAGES_DIR).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  if (!files.length) throw new Error(`No images found in ${IMAGES_DIR}`);

  console.log(`Uploading ${files.length} images to r2://${process.env.R2_BUCKET}/${KEY_PREFIX}/ ...`);
  for (const file of files) {
    const body = readFileSync(join(IMAGES_DIR, file));
    const contentType = file.toLowerCase().endsWith(".png")
      ? "image/png"
      : file.toLowerCase().endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: `${KEY_PREFIX}/${file}`,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));
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
  console.log(`Add this host to next.config.ts remotePatterns: ${new URL(PUBLIC_BASE).hostname}`);
})().catch((err) => {
  console.error("\nSync failed:", err.message);
  process.exit(1);
});
