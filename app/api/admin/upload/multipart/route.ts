import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getViewer, isStaff } from "@/lib/auth";
import { abortMultipart, completeMultipart, createMultipart, deleteObject, objectSize, signedPartUrls } from "@/lib/storage";
import { UPLOAD_RULES, isUploadKey, partSize, uploadDestination } from "@/lib/media";

const kind = z.enum(["video", "document", "image"]);
const uploadId = z.string().min(1).max(1024);

const body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    kind,
    filename: z.string().min(1).max(260),
    contentType: z.string().min(1).max(160),
    size: z.number().int().positive(),
    scope: z.string().max(80).optional(),
  }),
  z.object({
    action: z.literal("complete"),
    kind,
    key: z.string().max(400),
    uploadId,
    parts: z
      .array(z.object({ partNumber: z.number().int().min(1).max(10_000), etag: z.string().min(1).max(200) }))
      .min(1)
      .max(10_000),
  }),
  z.object({ action: z.literal("abort"), kind, key: z.string().max(400), uploadId }),
]);

/**
 * Staff only. Large files go straight from the browser to R2 in parts, so a dropped
 * connection costs one part instead of the whole file. The server signs the parts,
 * then finishes the upload and checks the stored size.
 */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || !isStaff(viewer.profile)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  const req = parsed.data;
  const rule = UPLOAD_RULES[req.kind];

  if (req.action === "create") {
    if (!(rule.types as readonly string[]).includes(req.contentType)) {
      return NextResponse.json({ error: `This file type is not allowed for ${req.kind} uploads.` }, { status: 400 });
    }
    if (req.size > rule.maxBytes) {
      return NextResponse.json({ error: `File is too large. The limit is ${Math.round(rule.maxBytes / 1024 / 1024)} MB.` }, { status: 400 });
    }
    const { bucket, key } = uploadDestination(req.kind, req.filename, req.scope);
    const size = partSize(req.size);
    const id = await createMultipart(bucket, key, req.contentType);
    const urls = await signedPartUrls(bucket, key, id, Math.ceil(req.size / size));
    return NextResponse.json({ key, uploadId: id, partSize: size, urls });
  }

  if (!isUploadKey(req.kind, req.key)) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });

  if (req.action === "abort") {
    await abortMultipart(rule.bucket, req.key, req.uploadId);
    return NextResponse.json({ ok: true });
  }

  try {
    await completeMultipart(rule.bucket, req.key, req.uploadId, [...req.parts].sort((a, b) => a.partNumber - b.partNumber));
  } catch {
    await abortMultipart(rule.bucket, req.key, req.uploadId);
    return NextResponse.json({ error: "The upload could not be finished. Please try again." }, { status: 502 });
  }
  // The browser declared the size when it started; this is what actually arrived.
  const stored = await objectSize(rule.bucket, req.key);
  if (stored === null || stored > rule.maxBytes) {
    await deleteObject(rule.bucket, req.key);
    return NextResponse.json({ error: "The file is larger than allowed and was removed." }, { status: 400 });
  }
  return NextResponse.json({ key: req.key, size: stored });
}
