import "server-only";
import { GetObjectCommand, PutObjectCommand, S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 (S3 API). Two buckets:
 *  - private: videos, PDFs, documents. Only reachable through short-lived signed URLs
 *    issued after the server has checked course access and module locks.
 *  - public: course covers, module covers, video posters. Served from NEXT_PUBLIC_MEDIA_URL.
 * Locally the same code talks to RustFS (see docker-compose.dev.yml).
 */

let client: S3Client | null = null;

function s3() {
  if (!client) {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("Storage is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.");
    }
    client = new S3Client({
      region: process.env.R2_REGION ?? "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

export const buckets = {
  get private() {
    return process.env.R2_PRIVATE_BUCKET ?? "academy-private";
  },
  get public() {
    return process.env.R2_PUBLIC_BUCKET ?? "academy-public";
  },
};

export type BucketKind = "private" | "public";

/** Keys that are absolute URLs or site paths are passed through (seed content, external hosting). */
function isPassThrough(key: string) {
  return key.startsWith("/") || /^https?:\/\//.test(key);
}

export async function signedGetUrl(
  key: string,
  opts: { expiresIn?: number; downloadName?: string; inline?: boolean } = {},
): Promise<string> {
  if (isPassThrough(key)) return key;
  const disposition = opts.downloadName
    ? `${opts.inline ? "inline" : "attachment"}; filename="${opts.downloadName.replace(/["\\\r\n]/g, "")}"`
    : undefined;
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: buckets.private, Key: key, ResponseContentDisposition: disposition }),
    { expiresIn: opts.expiresIn ?? 60 * 60 * 2 },
  );
}

export async function signedPutUrl(bucket: BucketKind, key: string, contentType: string, expiresIn = 60 * 30) {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: buckets[bucket], Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

export async function putObject(bucket: BucketKind, key: string, body: Uint8Array | Buffer, contentType: string) {
  await s3().send(
    new PutObjectCommand({
      Bucket: buckets[bucket],
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: bucket === "public" ? "public, max-age=31536000, immutable" : undefined,
    }),
  );
}

export async function deleteObject(bucket: BucketKind, key: string | null | undefined) {
  if (!key || isPassThrough(key)) return;
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: buckets[bucket], Key: key }));
  } catch {
    // Deleting media is best-effort; a stray object is cheaper than a failed save.
  }
}
