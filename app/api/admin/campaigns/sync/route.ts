import { NextResponse, type NextRequest } from "next/server";
import { getViewer, isStaff } from "@/lib/auth";
import { retryFailedInvites, syncPendingClaims } from "@/lib/campaigns/claims";
import { zohoConfigured } from "@/lib/zoho/client";

/**
 * Staff only. Re-sends the Hub invites that failed (the hourly email limit),
 * and sends every gift claim that is still waiting to Zoho CRM: the first run
 * after Zoho is connected, and retries after an outage.
 *   fetch("/api/admin/campaigns/sync", { method: "POST" })
 */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || !isStaff(viewer.profile)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const invites = await retryFailedInvites(process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin);
  if (!zohoConfigured()) return NextResponse.json({ invites, error: "Zoho is not connected. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET and ZOHO_REFRESH_TOKEN." }, { status: 409 });
  return NextResponse.json({ ...(await syncPendingClaims()), invites });
}
