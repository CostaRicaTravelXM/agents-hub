import { after, NextResponse, type NextRequest } from "next/server";
import { bumpClaim, currentClaim, syncClaim } from "@/lib/campaigns/claims";
import { KIT_FILE_NAME, KIT_KEY } from "@/lib/campaigns/thanksgiving";
import { signedGetUrl } from "@/lib/storage";

/** The Costa Rica Selling Kit. Only for a browser that has confirmed its claim; the file itself is a 5-minute signed link. */
export async function GET(request: NextRequest) {
  const held = await currentClaim();
  if (!held?.unlocked) return NextResponse.redirect(new URL("/thanksgiving", request.url));
  const { claim } = held;
  if (!claim.kit_downloaded_at) {
    await bumpClaim(claim.id, { kit_downloaded_at: new Date().toISOString() });
    after(() => syncClaim(claim.id));
  }
  const inline = request.nextUrl.searchParams.get("mode") !== "download";
  const url = await signedGetUrl(KIT_KEY, { expiresIn: 300, inline, downloadName: KIT_FILE_NAME });
  return NextResponse.redirect(url);
}
