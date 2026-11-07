import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Download, FileText } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getOffer } from "@/lib/hub/queries";
import { renderRichText } from "@/lib/rich-text";
import { DetailHero } from "@/components/hub/detail-hero";
import { DetailLayout, DetailSection } from "@/components/hub/detail-layout";
import { ExternalLink } from "@/components/hub/external-link";
import { StickyCta } from "@/components/hub/sticky-cta";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/offers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const offer = await getOffer(slug);
  return { title: offer ? offer.title : "Offer" };
}

export default async function OfferPage({ params }: PageProps<"/offers/[slug]">) {
  await requireViewer();
  const { slug } = await params;
  const offer = await getOffer(slug);
  if (!offer) notFound();

  const window = offer.valid_until
    ? `Valid until ${formatDate(offer.valid_until)}`
    : offer.valid_from
      ? `From ${formatDate(offer.valid_from)}`
      : "Available now";
  const body = renderRichText(offer.body);
  const primary = offer.cta_url ? (
    <Button asChild size="lg" block>
      <Link href={`/offers/${offer.slug}/interest`}>
        {offer.cta_label || "I'm interested"} <ArrowRight aria-hidden />
      </Link>
    </Button>
  ) : offer.file_key ? (
    <Button asChild size="lg" block>
      <a href={`/api/hub/offers/${offer.id}/file`} target="_blank" rel="noopener noreferrer">
        <FileText aria-hidden /> Open the PDF
      </a>
    </Button>
  ) : offer.link_url ? (
    <Button asChild size="lg" block>
      <a href={offer.link_url} target="_blank" rel="noopener noreferrer">
        Open the offer (new tab) <ArrowRight aria-hidden />
      </a>
    </Button>
  ) : null;

  const secondary = (
    <ul className="space-y-3">
      {offer.cta_url && offer.file_key ? (
        <li>
          <Button asChild variant="secondary" size="lg" block>
            <a href={`/api/hub/offers/${offer.id}/file`} target="_blank" rel="noopener noreferrer">
              <FileText aria-hidden /> Open the PDF
            </a>
          </Button>
        </li>
      ) : null}
      {offer.file_key ? (
        <li className="text-[15px] text-muted">
          <a href={`/api/hub/offers/${offer.id}/file?mode=download`} className="xm-link inline-flex min-h-11 items-center gap-1.5 font-semibold">
            <Download aria-hidden className="size-4 stroke-[2]" /> Download {offer.file_name ?? "the PDF"}
            {offer.file_size ? ` (${formatBytes(offer.file_size)})` : ""}
          </a>
        </li>
      ) : null}
      {offer.link_url && (offer.cta_url || offer.file_key) ? (
        <li className="text-[15px]">
          <ExternalLink href={offer.link_url} className="xm-link font-semibold">
            More about this offer
          </ExternalLink>
        </li>
      ) : null}
    </ul>
  );

  return (
    <article>
      <DetailHero
        back={{ href: "/offers", label: "Current Offers" }}
        imageKey={offer.image_key}
        imageLabel="Offer photo"
        meta={window}
        title={offer.title}
        subtitle={offer.excerpt}
        viewTransitionName={`offer-${offer.id}`}
      />
      <DetailLayout
        aside={
          primary || offer.file_key || offer.link_url ? (
            <div className="hidden rounded-lg bg-card p-6 shadow-raised lg:block">
              <h2 className="font-ui text-[20px] font-semibold text-ink">{window}</h2>
              {primary ? <div className="mt-5">{primary}</div> : null}
              <div className="mt-4">{secondary}</div>
            </div>
          ) : null
        }
      >
        {body ? (
          <DetailSection title="The offer">
            <div className="xm-prose md:text-[18px]" dangerouslySetInnerHTML={{ __html: body }} />
          </DetailSection>
        ) : offer.excerpt ? (
          <DetailSection title="The offer">
            <p className="xm-body-sm md:text-[18px]">{offer.excerpt}</p>
          </DetailSection>
        ) : null}
        <DetailSection title="Dates">
          <p className="xm-body-sm md:text-[18px]">
            {offer.valid_from ? `Starts ${formatDate(offer.valid_from)}. ` : ""}
            {offer.valid_until ? `Ends ${formatDate(offer.valid_until)}.` : "No end date announced."}
          </p>
        </DetailSection>
        <div className="mt-8 lg:hidden">{secondary}</div>
      </DetailLayout>
      {primary ? <StickyCta>{primary}</StickyCta> : null}
    </article>
  );
}
