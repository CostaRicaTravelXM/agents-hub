import "server-only";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PUBLIC_CACHE_CONTROL } from "@/lib/media";

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

const cacheControl = (bucket: BucketKind) => (bucket === "public" ? PUBLIC_CACHE_CONTROL : undefined);

/**
 * A browser upload in one request. The headers are part of the signature, so the
 * browser must send exactly the ones returned here (public files carry the CDN cache rule).
 */
export async function signedPutUrl(bucket: BucketKind, key: string, contentType: string, expiresIn = 60 * 30) {
  const headers: Record<string, string> = { "Content-Type": contentType };
  const cache = cacheControl(bucket);
  if (cache) headers["Cache-Control"] = cache;
  const url = await getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: buckets[bucket], Key: key, ContentType: contentType, CacheControl: cache }),
    { expiresIn, signableHeaders: new Set(Object.keys(headers).map((h) => h.toLowerCase())) },
  );
  return { url, headers };
}

/** Large files go up in parts, each signed here and sent by the browser straight to storage. */
export async function createMultipart(bucket: BucketKind, key: string, contentType: string) {
  const res = await s3().send(
    new CreateMultipartUploadCommand({ Bucket: buckets[bucket], Key: key, ContentType: contentType, CacheControl: cacheControl(bucket) }),
  );
  if (!res.UploadId) throw new Error("Storage did not start the upload");
  return res.UploadId;
}

export async function signedPartUrls(bucket: BucketKind, key: string, uploadId: string, parts: number, expiresIn = 60 * 60 * 6) {
  return Promise.all(
    Array.from({ length: parts }, (_, i) =>
      getSignedUrl(s3(), new UploadPartCommand({ Bucket: buckets[bucket], Key: key, UploadId: uploadId, PartNumber: i + 1 }), { expiresIn }),
    ),
  );
}

export async function completeMultipart(bucket: BucketKind, key: string, uploadId: string, parts: { partNumber: number; etag: string }[]) {
  await s3().send(
    new CompleteMultipartUploadCommand({
      Bucket: buckets[bucket],
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })) },
    }),
  );
}

export async function abortMultipart(bucket: BucketKind, key: string, uploadId: string) {
  try {
    await s3().send(new AbortMultipartUploadCommand({ Bucket: buckets[bucket], Key: key, UploadId: uploadId }));
  } catch {
    // Unfinished parts also expire on their own; a failed abort must not hide the upload error.
  }
}

/** Stored size in bytes, or null when the object does not exist. */
export async function objectSize(bucket: BucketKind, key: string): Promise<number | null> {
  try {
    const res = await s3().send(new HeadObjectCommand({ Bucket: buckets[bucket], Key: key }));
    return res.ContentLength ?? null;
  } catch {
    return null;
  }
}

export async function putObject(bucket: BucketKind, key: string, body: Uint8Array | Buffer, contentType: string) {
  await s3().send(
    new PutObjectCommand({
      Bucket: buckets[bucket],
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl(bucket),
    }),
  );
}

/** Reads an object into memory. Null when it does not exist. Only for server-side rendering jobs (book pages). */
export async function getObjectBytes(bucket: BucketKind, key: string): Promise<Uint8Array | null> {
  try {
    const res = await s3().send(new GetObjectCommand({ Bucket: buckets[bucket], Key: key }));
    if (!res.Body) return null;
    return await res.Body.transformToByteArray();
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === "NoSuchKey" || name === "NotFound") return null;
    throw e;
  }
}

export async function deleteObject(bucket: BucketKind, key: string | null | undefined) {
  if (!key || isPassThrough(key)) return;
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: buckets[bucket], Key: key }));
  } catch {
    // Deleting media is best-effort; a stray object is cheaper than a failed save.
  }
}
