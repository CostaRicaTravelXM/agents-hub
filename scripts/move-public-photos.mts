/**
 * One-time move of the FAM trip photos from the app's own files (/photos/...) to the
 * public R2 bucket, so they are served by the Cloudflare CDN and the admin can
 * replace them like any other upload.
 *
 *   node --env-file=.env.local scripts/move-public-photos.mts            dry run, changes nothing
 *   node --env-file=.env.local scripts/move-public-photos.mts --apply    uploads and updates the rows
 *
 * Only `hub_fam_trips.image_key` is changed, and only on rows that still point at
 * /photos/. Running it again skips what is already done.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const CACHE = "public, max-age=31536000, immutable";
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

const need = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
const unset = need.filter((n) => !process.env[n]);
if (unset.length) {
  console.error(`Not set: ${unset.join(", ")}. Nothing was changed.`);
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const s3 = new S3Client({
  region: process.env.R2_REGION ?? "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
});
const bucket = process.env.R2_PUBLIC_BUCKET ?? "academy-public";

async function storedSize(key: string) {
  try {
    return (await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))).ContentLength ?? null;
  } catch {
    return null;
  }
}

const { data: trips, error } = await supabase.from("hub_fam_trips").select("id, slug, image_key").like("image_key", "/photos/%").order("sort_order");
if (error) {
  console.error(`Could not read the FAM trips: ${error.message}`);
  process.exit(1);
}

console.log(`${apply ? "Moving" : "Dry run:"} ${trips.length} FAM trip photo(s) to bucket "${bucket}" at ${new URL(process.env.R2_ENDPOINT!).host}`);
let failed = 0;
for (const trip of trips) {
  const file = path.join(process.cwd(), "public", trip.image_key!);
  const ext = path.extname(file).toLowerCase();
  const key = `images/fam-trips/${path.basename(file).toLowerCase()}`;
  if (!existsSync(file) || !TYPES[ext]) {
    console.log(`  ✗ ${trip.slug}: ${trip.image_key} is not a photo in public/`);
    failed++;
    continue;
  }
  const body = readFileSync(file);
  console.log(`  ${trip.slug}: ${trip.image_key} → ${key}`);
  if (!apply) continue;
  if ((await storedSize(key)) !== body.length) {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: TYPES[ext], CacheControl: CACHE }));
  }
  const { error: updateError } = await supabase.from("hub_fam_trips").update({ image_key: key }).eq("id", trip.id).eq("image_key", trip.image_key!);
  if (updateError) {
    console.log(`  ✗ ${trip.slug}: uploaded, but the row was not updated (${updateError.message})`);
    failed++;
  }
}
console.log(apply ? `Done. ${trips.length - failed} moved, ${failed} need attention.` : "Nothing changed. Add --apply to move them.");
process.exitCode = failed ? 1 : 0;
