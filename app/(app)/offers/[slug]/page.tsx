import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Download, FileText, Image as ImageIcon } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getOffer } from "@/lib/hub/queries";
import { renderRichText } from "@/lib/rich-text";
import { DetailHero } from "@/components/hub/detail-hero";
import { DetailLayout, DetailSection } from "@/components/hub/detail-layout";
import { ExternalLink } from "@/components/hub/external-link";
import { StickyCta } from "@/components/hub/sticky-cta";
import { Button } from "@/components/ui/button";
import { isImageFile } from "@/lib/media";
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
  const fileUrl = `/api/hub/offers/${offer.id}/file`;
  // A flyer picture is shown on the page; a PDF opens in a new tab.
  const flyer = offer.file_key ? isImageFile(offer.file_name, offer.file_key) : false;
  const openFile = flyer ? (
    <>
      <ImageIcon aria-hidden /> Open the flyer
    </>
  ) : (
    <>
      <FileText aria-hidden /> Open the details (PDF)
    </>
  );
  const primary = offer.cta_url ? (
    <Button asChild size="lg" block>
      <Link href={`/offers/${offer.slug}/interest`}>
        {offer.cta_label || "I'm interested"} <ArrowRight aria-hidden />
      </Link>
    </Button>
  ) : offer.file_key ? (
    <Button asChild size="lg" block>
      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
        {openFile}
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
      {offer.cta_url && offer.file_key && !flyer ? (
        <li>
          <Button asChild variant="secondary" size="lg" block>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              {openFile}
            </a>
          </Button>
        </li>
      ) : null}
      {offer.file_key ? (
        <li className="text-[15px] text-muted">
          <a href={`${fileUrl}?mode=download`} className="xm-link inline-flex min-h-11 items-center gap-1.5 font-semibold">
            <Download aria-hidden className="size-4 stroke-[2]" /> Download {flyer ? "the flyer" : (offer.file_name ?? "the PDF")}
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
        {flyer ? (
          <DetailSection title="The flyer">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-lg bg-sunken shadow-card">
              {/* The file route hands the browser a short-lived link to the private file; next/image cannot follow it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl} alt={`${offer.title}: the flyer`} className="block h-auto w-full transition-[scale] duration-500 ease-standard group-hover:scale-[1.01]" />
              <span className="sr-only">Opens full size in a new tab</span>
            </a>
          </DetailSection>
        ) : null}
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
