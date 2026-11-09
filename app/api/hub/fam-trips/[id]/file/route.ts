import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedGetUrl } from "@/lib/storage";

/** Itinerary PDF: open inline (default) or download. RLS hides draft trips from agents; group trips stay readable by everyone. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/hub/fam-trips/[id]/file">) {
  const { id } = await ctx.params;
  const download = request.nextUrl.searchParams.get("mode") === "download";
  const supabase = await createClient();
  const { data: trip } = await supabase.from("hub_fam_trips").select("file_key, file_name, title").eq("id", id).maybeSingle();
  if (!trip?.file_key) return NextResponse.redirect(new URL("/fam-trips", request.url));
  const url = await signedGetUrl(trip.file_key, { expiresIn: 300, inline: !download, downloadName: trip.file_name ?? `${trip.title} itinerary.pdf` });
  return NextResponse.redirect(url);
}
