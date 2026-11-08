import { slugify } from "@/lib/utils";

/** Public URL for an image key in the public bucket (covers, posters). Safe on client and server. */
export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("/") || /^https?:\/\//.test(key)) return key;
  const base = (process.env.NEXT_PUBLIC_MEDIA_URL ?? "").replace(/\/$/, "");
  return `${base}/${key}`;
}

export const UPLOAD_RULES = {
  // R2 takes at most 5 GiB in one PUT; larger files go up in parts, so this is our own cap.
  video: { bucket: "private", folder: "videos", maxBytes: 5 * 1024 ** 3, types: ["video/mp4", "video/webm", "video/quicktime"] },
  document: {
    bucket: "private",
    folder: "documents",
    maxBytes: 200 * 1024 ** 2,
    types: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
      "image/jpeg",
      "image/png",
    ],
  },
  image: { bucket: "public", folder: "images", maxBytes: 15 * 1024 ** 2, types: ["image/jpeg", "image/png", "image/webp", "image/avif"] },
} as const;

export type UploadKind = keyof typeof UPLOAD_RULES;

/**
 * Public files never change under the same key (every upload gets a fresh one),
 * so the CDN and browsers may keep them for a year.
 */
export const PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** Cloudflare suggests one PUT below about 100 MB and parts above it. */
export const MULTIPART_THRESHOLD = 100 * 1024 ** 2;
const MIN_PART_SIZE = 16 * 1024 ** 2;
const MAX_PARTS = 10_000;

/** Parts must be the same size (except the last) and at most 10,000 of them. */
export function partSize(fileSize: number) {
  return Math.max(MIN_PART_SIZE, Math.ceil(fileSize / MAX_PARTS / (1024 * 1024)) * 1024 * 1024);
}

/**
 * Where an admin upload lands: the bucket comes from the kind of file, the folder
 * from the kind plus the form's scope (for example `images/fam-trips/`), and a
 * random prefix keeps every key unique.
 */
export function uploadDestination(kind: UploadKind, filename: string, scope?: string, random = crypto.randomUUID().slice(0, 8)) {
  const rule = UPLOAD_RULES[kind];
  const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = slugify(filename.replace(/\.[^.]+$/, "")) || kind;
  const scoped = scope ? slugify(scope) : "";
  const key = `${rule.folder}/${scoped ? `${scoped}/` : ""}${random}-${base}${ext ? `.${ext}` : ""}`;
  return { bucket: rule.bucket, key };
}

/** A key this kind of upload could have produced. Guards the multipart calls that name a key. */
export function isUploadKey(kind: UploadKind, key: string) {
  return new RegExp(`^${UPLOAD_RULES[kind].folder}/([a-z0-9-]+/)?[0-9a-f]{8}-[a-z0-9-]+(\\.[a-z0-9]+)?$`).test(key);
}
