/**
 * Puts the Thanksgiving Costa Rica Selling Kit in the private bucket, where
 * /api/thanksgiving/kit hands it out through 5-minute signed links.
 *
 *   node --env-file=.env.local scripts/upload-campaign-kit.mts "<path to the PDF>"            dry run
 *   node --env-file=.env.local scripts/upload-campaign-kit.mts "<path to the PDF>" --apply    uploads
 *
 * Uploading again replaces the file, so a corrected kit needs no code change.
 */
import { existsSync, readFileSync } from "node:fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Keep in sync with KIT_KEY in lib/campaigns/thanksgiving.ts.
const KEY = "documents/campaigns/thanksgiving-2026/costa-rica-selling-kit.pdf";
const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
const apply = process.argv.includes("--apply");

const need = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
const unset = need.filter((n) => !process.env[n]);
if (unset.length) {
  console.error(`Not set: ${unset.join(", ")}. Nothing was changed.`);
  process.exit(1);
}
if (!file || !existsSync(file)) {
  console.error("Give the path to the kit PDF. Nothing was changed.");
  process.exit(1);
}
const body = readFileSync(file);
if (body.subarray(0, 5).toString() !== "%PDF-") {
  console.error("That file is not a PDF. Nothing was changed.");
  process.exit(1);
}

const bucket = process.env.R2_PRIVATE_BUCKET ?? "academy-private";
const where = `${process.env.R2_ENDPOINT} / ${bucket} / ${KEY}`;
if (!apply) {
  console.log(`Dry run. Would upload ${(body.length / 1024 / 1024).toFixed(1)} MB to ${where}. Add --apply to do it.`);
  process.exit(0);
}

const s3 = new S3Client({
  region: process.env.R2_REGION ?? "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
await s3.send(new PutObjectCommand({ Bucket: bucket, Key: KEY, Body: body, ContentType: "application/pdf" }));
console.log(`Uploaded ${(body.length / 1024 / 1024).toFixed(1)} MB to ${where}.`);
