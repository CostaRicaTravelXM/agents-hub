import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { getOffer } from "@/lib/hub/queries";
import { prefilledCtaUrl } from "@/lib/hub/cta";
import { InterestPage } from "@/components/hub/interest-page";

export const metadata: Metadata = { title: "I'm interested" };

export default async function OfferInterestPage({ params }: PageProps<"/offers/[slug]/interest">) {
  const viewer = await requireViewer();
  const { slug } = await params;
  const offer = await getOffer(slug);
  if (!offer) notFound();
  return (
    <InterestPage
      back={{ href: `/offers/${offer.slug}`, label: offer.title }}
      heading={offer.cta_label || "I'm interested"}
      itemTitle={offer.title}
      formUrl={prefilledCtaUrl(offer.cta_url, { first_name: viewer.profile.first_name, last_name: viewer.profile.last_name, email: viewer.email, company: viewer.profile.company, is_independent: viewer.profile.is_independent })}
      mailto={`mailto:sales@travelxm.com?subject=${encodeURIComponent(`Offer: ${offer.title}`)}`}
    />
  );
}
