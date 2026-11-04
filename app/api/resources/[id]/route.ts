import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedGetUrl } from "@/lib/storage";

/** Resource download: RLS decides whether the viewer may see it, then we redirect to a short-lived URL. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/resources/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: resource } = await supabase
    .from("resources")
    .select("id, course_id, title, file_key, file_name, external_url")
    .eq("id", id)
    .maybeSingle();
  if (!resource) return NextResponse.redirect(new URL("/resources?missing=1", request.url));

  await supabase.rpc("log_event", {
    p_event: "resource_download",
    p_course: resource.course_id,
    p_payload: { resource_id: resource.id },
  });

  if (resource.file_key) {
    const url = await signedGetUrl(resource.file_key, { expiresIn: 300, downloadName: resource.file_name ?? resource.title });
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(resource.external_url!);
}
