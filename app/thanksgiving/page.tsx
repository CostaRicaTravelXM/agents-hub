/*
 * Thanksgiving 2026 gift page. Public, one screen: the beach loop behind, the
 * gift in front. Each channel links here with its own ?ch= (email, whatsapp,
 * instagram…), which is stored with the claim and sent to Zoho CRM.
 */
import type { Metadata, Viewport } from "next";
import { GiftStage } from "@/components/thanksgiving/gift-stage";
import type { SpotlightTrip } from "@/components/thanksgiving/claim-sheet";
import { currentClaim, hasHubAccount } from "@/lib/campaigns/claims";
import { parseChannel } from "@/lib/campaigns/thanksgiving";
import { famTripTiming } from "@/lib/hub/fam";
import { env } from "@/lib/env";
import { mediaUrl } from "@/lib/media";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { absolute: "Happy Thanksgiving from TravelXM" },
  description: "A thank-you gift for travel advisors who sell Costa Rica: the TravelXM Costa Rica Selling Kit.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#e9b071" };

/** Three open trips to show after the kit. Titles and dates only: nothing an advisor could not see on the public site. */
async function spotlightTrips(): Promise<SpotlightTrip[]> {
  try {
    const { data } = await createServiceClient()
      .from("hub_fam_trips")
      .select("slug, title, timing_label, nights, image_key, image_alt")
      .eq("status", "published")
      .eq("audience", "open")
      .order("sort_order")
      .order("created_at")
      .limit(3);
    return (data ?? []).map((t) => ({ slug: t.slug, title: t.title, timing: famTripTiming(t), nights: t.nights, image: mediaUrl(t.image_key), imageAlt: t.image_alt }));
  } catch {
    return [];
  }
}

export default async function ThanksgivingPage({ searchParams }: PageProps<"/thanksgiving">) {
  const sp = await searchParams;
  const [held, trips] = await Promise.all([currentClaim(), spotlightTrips()]);
  // A browser that already confirmed its claim goes straight to the gift, and is told where its Hub access is.
  const hub = held?.unlocked ? { email: held.claim.email, member: await hasHubAccount(held.claim.email) } : undefined;
  return <GiftStage channel={parseChannel(sp.ch)} unlocked={Boolean(held?.unlocked)} hub={hub} turnstileSiteKey={env.turnstile?.siteKey} trips={trips} />;
}
