import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { getFamTrip } from "@/lib/hub/queries";
import { prefilledCtaUrl } from "@/lib/hub/cta";
import { InterestPage } from "@/components/hub/interest-page";

export const metadata: Metadata = { title: "Register interest" };

export default async function FamTripInterestPage({ params }: PageProps<"/fam-trips/[slug]/interest">) {
  const viewer = await requireViewer();
  const { slug } = await params;
  const trip = await getFamTrip(slug);
  if (!trip) notFound();
  return (
    <InterestPage
      back={{ href: `/fam-trips/${trip.slug}`, label: trip.title }}
      heading="Register your interest"
      itemTitle={trip.title}
      formUrl={prefilledCtaUrl(trip.cta_url, { first_name: viewer.profile.first_name, last_name: viewer.profile.last_name, email: viewer.email, company: viewer.profile.company, is_independent: viewer.profile.is_independent })}
      mailto={`mailto:sales@travelxm.com?subject=${encodeURIComponent(`Costa Rica FAM interest: ${trip.title}`)}`}
    />
  );
}
