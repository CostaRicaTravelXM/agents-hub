import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedGetUrl } from "@/lib/storage";

/** Offer PDF: open inline (default) or download. RLS hides drafts and expired offers from agents. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/hub/offers/[id]/file">) {
  const { id } = await ctx.params;
  const download = request.nextUrl.searchParams.get("mode") === "download";
  const supabase = await createClient();
  const { data: offer } = await supabase.from("hub_offers").select("file_key, file_name, title").eq("id", id).maybeSingle();
  if (!offer?.file_key) return NextResponse.redirect(new URL("/offers", request.url));
  const url = await signedGetUrl(offer.file_key, { expiresIn: 300, inline: !download, downloadName: offer.file_name ?? `${offer.title}.pdf` });
  return NextResponse.redirect(url);
}
