import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getViewer, isStaff } from "@/lib/auth";
import { signedPutUrl } from "@/lib/storage";
import { UPLOAD_RULES, uploadDestination } from "@/lib/media";

const body = z.object({
  kind: z.enum(["video", "document", "image"]),
  filename: z.string().min(1).max(260),
  contentType: z.string().min(1).max(160),
  size: z.number().int().positive(),
  scope: z.string().max(80).optional(),
});

/** Staff only: returns a presigned PUT so the browser uploads straight to R2. */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || !isStaff(viewer.profile)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  const { kind, filename, contentType, size, scope } = parsed.data;
  const rule = UPLOAD_RULES[kind];
  if (!(rule.types as readonly string[]).includes(contentType)) {
    return NextResponse.json({ error: `This file type is not allowed for ${kind} uploads.` }, { status: 400 });
  }
  if (size > rule.maxBytes) {
    return NextResponse.json({ error: `File is too large. The limit is ${Math.round(rule.maxBytes / 1024 / 1024)} MB.` }, { status: 400 });
  }
  const { bucket, key } = uploadDestination(kind, filename, scope);
  const { url, headers } = await signedPutUrl(bucket, key, contentType);
  return NextResponse.json({ url, headers, key, bucket });
}
