import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { FAM_SEGMENT_LABEL } from "@/lib/hub/fam";
import { getFamTrip } from "@/lib/hub/queries";
import { renderRichText } from "@/lib/rich-text";
import { DetailHero } from "@/components/hub/detail-hero";
import { DetailLayout, DetailSection } from "@/components/hub/detail-layout";
import { StickyCta } from "@/components/hub/sticky-cta";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/surface";

export async function generateMetadata({ params }: PageProps<"/fam-trips/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const trip = await getFamTrip(slug);
  return { title: trip ? trip.title : "FAM trip" };
}

export default async function FamTripPage({ params }: PageProps<"/fam-trips/[slug]">) {
  await requireViewer();
  const { slug } = await params;
  const trip = await getFamTrip(slug);
  if (!trip) notFound();

  const meta = [trip.timing_label, `${trip.nights} nights`].filter(Boolean).join(" · ");
  const body = renderRichText(trip.body);
  const interestHref = trip.cta_url ? `/fam-trips/${trip.slug}/interest` : `mailto:sales@travelxm.com?subject=${encodeURIComponent(`Costa Rica FAM interest: ${trip.title}`)}`;
  const cta = (
    <Button asChild size="lg" block>
      {trip.cta_url ? (
        <Link href={interestHref}>
          {trip.cta_label} <ArrowRight aria-hidden />
        </Link>
      ) : (
        <a href={interestHref}>
          <Mail aria-hidden /> Email us about this trip
        </a>
      )}
    </Button>
  );

  return (
    <article>
      <DetailHero
        back={{ href: "/fam-trips", label: "FAM Trips" }}
        imageKey={trip.image_key}
        imageAlt={trip.image_alt ?? ""}
        imageLabel="Trip photo"
        meta={meta}
        title={trip.title}
        viewTransitionName={`fam-${trip.id}`}
      />
      <DetailLayout
        aside={
          <div className="hidden rounded-lg bg-card p-6 shadow-raised lg:block">
            <h2 className="font-ui text-[20px] font-semibold text-ink">Interested in this trip?</h2>
            <p className="mt-2 text-[16px] text-muted">Tell us, and the TravelXM team will send you the dates, the programme and the cost.</p>
            <div className="mt-5">{cta}</div>
            <p className="mt-3 text-[15px] text-muted">A short form. It takes about a minute.</p>
          </div>
        }
      >
        <DetailSection title="About this trip">
          <p className="xm-body-sm md:text-[18px]">{trip.summary}</p>
        </DetailSection>
        {trip.expect ? (
          <DetailSection title="What advisors can expect">
            <p className="xm-body-sm md:text-[18px]">{trip.expect}</p>
          </DetailSection>
        ) : null}
        {body ? (
          <DetailSection title="The details">
            <div className="xm-prose md:text-[18px]" dangerouslySetInnerHTML={{ __html: body }} />
          </DetailSection>
        ) : null}
        {trip.regions.length ? (
          <DetailSection title="Where you will go">
            <div className="flex flex-wrap gap-2">
              {trip.regions.map((r) => (
                <Tag key={r}>{r}</Tag>
              ))}
            </div>
          </DetailSection>
        ) : null}
        {trip.segments.length ? (
          <DetailSection title="Who it is for">
            <div className="flex flex-wrap gap-2">
              {trip.segments.map((s) => (
                <Tag key={s}>{FAM_SEGMENT_LABEL[s] ?? s}</Tag>
              ))}
            </div>
          </DetailSection>
        ) : null}
      </DetailLayout>
      <StickyCta>{cta}</StickyCta>
    </article>
  );
}
