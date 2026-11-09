import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Download, FileText, Mail } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { FAM_SEGMENT_LABEL, famTripTiming } from "@/lib/hub/fam";
import { getFamTrip, getFamTripAccess } from "@/lib/hub/queries";
import { renderRichText } from "@/lib/rich-text";
import { DetailHero } from "@/components/hub/detail-hero";
import { DetailLayout, DetailSection } from "@/components/hub/detail-layout";
import { StickyCta } from "@/components/hub/sticky-cta";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/surface";
import { formatBytes } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/fam-trips/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const trip = await getFamTrip(slug);
  return { title: trip ? trip.title : "FAM trip" };
}

/** "Acme Travel", "Acme Travel and Sol Tours", "Acme, Sol and Mar". */
function listNames(names: string[]) {
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export default async function FamTripPage({ params }: PageProps<"/fam-trips/[slug]">) {
  await requireViewer();
  const { slug } = await params;
  const trip = await getFamTrip(slug);
  if (!trip) notFound();
  const access = await getFamTripAccess(trip.id);

  const meta = [access.groupOnly ? "Group trip" : null, famTripTiming(trip), `${trip.nights} nights`].filter(Boolean).join(" · ");
  const body = renderRichText(trip.body);
  const fileHref = `/api/hub/fam-trips/${trip.id}/file`;
  const mailSubject = access.canApply ? `Costa Rica FAM interest: ${trip.title}` : `A FAM trip like “${trip.title}” for my agency`;
  const mailto = `mailto:sales@travelxm.com?subject=${encodeURIComponent(mailSubject)}`;

  const cta = access.canApply ? (
    <Button asChild size="lg" block>
      {trip.cta_url ? (
        <Link href={`/fam-trips/${trip.slug}/interest`}>
          {trip.cta_label} <ArrowRight aria-hidden />
        </Link>
      ) : (
        <a href={mailto}>
          <Mail aria-hidden /> Email us about this trip
        </a>
      )}
    </Button>
  ) : (
    <Button asChild size="lg" variant="secondary" block>
      <a href={mailto}>
        <Mail aria-hidden /> Ask about a trip for your agency
      </a>
    </Button>
  );

  const reservedFor = access.groupNames.length ? `agents of ${listNames(access.groupNames)}` : "invited agencies";

  const pdfLinks = trip.file_key ? (
    <ul className="space-y-3">
      <li>
        <Button asChild variant="secondary" size="lg" block>
          <a href={fileHref} target="_blank" rel="noopener noreferrer">
            <FileText aria-hidden /> Open the itinerary (PDF)
          </a>
        </Button>
      </li>
      <li className="text-[15px] text-muted">
        <a href={`${fileHref}?mode=download`} className="xm-link inline-flex min-h-11 items-center gap-1.5 font-semibold">
          <Download aria-hidden className="size-4 stroke-[2]" /> Download {trip.file_name ?? "the itinerary"}
          {trip.file_size ? ` (${formatBytes(trip.file_size)})` : ""}
        </a>
      </li>
    </ul>
  ) : null;

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
            {access.canApply ? (
              <>
                <h2 className="font-ui text-[20px] font-semibold text-ink">Interested in this trip?</h2>
                <p className="mt-2 text-[16px] text-muted">
                  {trip.file_key ? "Read the itinerary, then tell us you’d like to join." : "Tell us, and the TravelXM team will send you the dates, the programme and the cost."}
                </p>
                <div className="mt-5">{cta}</div>
                {trip.cta_url ? <p className="mt-3 text-[15px] text-muted">A short form. It takes about a minute.</p> : null}
              </>
            ) : (
              <>
                <h2 className="font-ui text-[20px] font-semibold text-ink">Reserved for a group</h2>
                <p className="mt-2 text-[16px] text-muted">
                  This trip is for {reservedFor}. Want one like it for your agency? Tell us.
                </p>
                <div className="mt-5">{cta}</div>
              </>
            )}
            {pdfLinks ? <div className="mt-4">{pdfLinks}</div> : null}
          </div>
        }
      >
        {!access.canApply ? (
          <p className="mb-8 rounded-lg bg-card p-5 text-[16px] text-ink shadow-card lg:hidden">
            <span className="font-semibold">Reserved for a group.</span> This trip is for {reservedFor}.
          </p>
        ) : null}
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
        {pdfLinks ? (
          <div className="lg:hidden">
            <DetailSection title="Itinerary">{pdfLinks}</DetailSection>
          </div>
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
