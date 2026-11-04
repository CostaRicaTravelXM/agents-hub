/** Public URL for an image key in the public bucket (covers, posters). Safe on client and server. */
export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("/") || /^https?:\/\//.test(key)) return key;
  const base = (process.env.NEXT_PUBLIC_MEDIA_URL ?? "").replace(/\/$/, "");
  return `${base}/${key}`;
}

export const UPLOAD_RULES = {
  video: { bucket: "private", maxBytes: 5 * 1024 ** 3, types: ["video/mp4", "video/webm", "video/quicktime"] },
  document: {
    bucket: "private",
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
  image: { bucket: "public", maxBytes: 15 * 1024 ** 2, types: ["image/jpeg", "image/png", "image/webp", "image/avif"] },
} as const;

export type UploadKind = keyof typeof UPLOAD_RULES;
