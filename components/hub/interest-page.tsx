import Link from "next/link";
import { ChevronLeft, Mail } from "lucide-react";
import { Page } from "@/components/shell/app-shell";
import { ExternalLink } from "@/components/hub/external-link";
import { ZohoFormFrame } from "@/components/hub/zoho-form-frame";
import { Button } from "@/components/ui/button";
import { isZohoForm } from "@/lib/hub/cta";

/**
 * "I'm interested" page for a FAM trip or an offer. The TravelXM form is shown
 * inside the Hub with the advisor's details already filled in; a plain link
 * opens it in a new tab for anyone the embed does not work for.
 */
export function InterestPage({
  back,
  heading,
  itemTitle,
  formUrl,
  mailto,
}: {
  back: { href: string; label: string };
  heading: string;
  itemTitle: string;
  formUrl: string | null;
  mailto: string;
}) {
  return (
    <Page className="max-w-[880px]">
      <Link href={back.href} className="inline-flex h-11 items-center gap-1 rounded-pill bg-sunken pr-4 pl-2.5 font-ui text-[15px] font-semibold text-ink transition-colors duration-120 ease-standard hover:bg-line">
        <ChevronLeft aria-hidden className="size-5 stroke-[2]" /> {back.label}
      </Link>
      <h1 className="xm-title mt-4">{heading}</h1>
      <p className="xm-lead mt-3 text-muted">
        <span className="font-semibold text-ink">{itemTitle}</span>. Fill in the short form below and the TravelXM team will get back to you by email.
      </p>

      {formUrl && isZohoForm(formUrl) ? (
        <div className="mt-8">
          <ZohoFormFrame src={formUrl} title={`${heading}: ${itemTitle}`} />
          <p className="mt-4 text-[15px] text-muted">
            Trouble with the form?{" "}
            <ExternalLink href={formUrl} className="xm-link inline-flex min-h-11 items-center font-semibold">
              Open it on its own page
            </ExternalLink>
          </p>
        </div>
      ) : formUrl ? (
        <div className="mt-8 rounded-lg bg-card p-6 shadow-card">
          <p className="text-[16px] text-body">The form opens on another website.</p>
          <Button asChild size="lg" className="mt-4">
            <a href={formUrl} target="_blank" rel="noopener noreferrer">
              Open the form (new tab)
            </a>
          </Button>
        </div>
      ) : (
        <div className="mt-8 rounded-lg bg-card p-6 shadow-card">
          <p className="text-[16px] text-body">Send us an email and we will reply with the details.</p>
          <Button asChild size="lg" className="mt-4">
            <a href={mailto}>
              <Mail aria-hidden /> Email the TravelXM team
            </a>
          </Button>
        </div>
      )}
    </Page>
  );
}
