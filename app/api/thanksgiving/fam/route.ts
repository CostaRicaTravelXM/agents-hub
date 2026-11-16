import { after, NextResponse, type NextRequest } from "next/server";
import { bumpClaim, currentClaim, syncClaim } from "@/lib/campaigns/claims";

/** Notes that the advisor opened a FAM trip from the gift page, then sends them to it in the Hub. */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("trip") ?? "";
  const target = /^[a-z0-9-]{1,80}$/.test(slug) ? `/fam-trips/${slug}` : "/fam-trips";
  const held = await currentClaim();
  if (held?.unlocked && !held.claim.fam_opened_at) {
    const id = held.claim.id;
    await bumpClaim(id, { fam_opened_at: new Date().toISOString() });
    after(() => syncClaim(id));
  }
  return NextResponse.redirect(new URL(target, request.url));
}
