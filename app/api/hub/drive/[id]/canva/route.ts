import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { canvaLinkFor, DriveError, driveFolderId, resolveDrivePath } from "@/lib/hub/drive";
import { listLinks } from "@/lib/hub/queries";

/**
 * The editable Canva design for a marketing file, read from its Drive comments.
 * `path` is the folder the advisor is in; the file must sit in it, under the marketing
 * root, so this never reads comments on files outside the shared folder.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/hub/drive/[id]/canva">) {
  if (!(await getViewer())) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await ctx.params;
  const path = (request.nextUrl.searchParams.get("path") ?? "").split("/").filter(Boolean);

  const links = await listLinks("marketing");
  const rootId = links.map((l) => driveFolderId(l.url)).find(Boolean);
  if (!rootId) return NextResponse.json({ url: null }, { status: 404 });

  try {
    const folder = await resolveDrivePath(rootId, path);
    if (!folder?.items.some((i) => i.id === id && !i.isFolder)) return NextResponse.json({ url: null }, { status: 404 });
    const url = await canvaLinkFor(id);
    return NextResponse.json({ url }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (e) {
    if (!(e instanceof DriveError)) throw e;
    console.error(e.message);
    return NextResponse.json({ url: null }, { status: 502 });
  }
}
