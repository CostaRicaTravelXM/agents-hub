import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedGetUrl } from "@/lib/storage";

/**
 * Fresh signed URL for a lesson's video or file. The player calls this when a
 * URL expires mid-session. Access and module locks are checked in the database.
 *   ?kind=video|file  &mode=inline|download
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/media/lesson/[lessonId]">) {
  const { lessonId } = await ctx.params;
  const kind = request.nextUrl.searchParams.get("kind") === "file" ? "file" : "video";
  const mode = request.nextUrl.searchParams.get("mode") === "download" ? "download" : "inline";
  const supabase = await createClient();

  const { data: available } = await supabase.rpc("lesson_available", { p_lesson: lessonId });
  if (!available) return NextResponse.json({ error: "Not available" }, { status: 403 });

  const { data: lesson } = await supabase.from("lessons").select("video_key, file_key, file_name").eq("id", lessonId).maybeSingle();
  const key = kind === "video" ? lesson?.video_key : lesson?.file_key;
  if (!key) return NextResponse.json({ error: "No media" }, { status: 404 });

  const url = await signedGetUrl(key, {
    downloadName: kind === "file" ? (lesson?.file_name ?? undefined) : undefined,
    inline: mode === "inline",
  });
  if (request.nextUrl.searchParams.get("redirect") === "1") return NextResponse.redirect(url);
  return NextResponse.json({ url }, { headers: { "Cache-Control": "private, no-store" } });
}
