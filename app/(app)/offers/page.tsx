import type { Metadata } from "next";
import { BadgePercent } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { listCurrentOffers } from "@/lib/hub/queries";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { MediaCard } from "@/components/hub/media-card";
import { Badge, EmptyState } from "@/components/ui/surface";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Current Offers" };

export default async function OffersPage() {
  await requireViewer();
  const offers = await listCurrentOffers();
  return (
    <Page>
      <PageHeader title="Current Offers" lead="Deals and promotions you can sell right now. Each one says how long it lasts." />
      {offers.length ? (
        <ul className="grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((o, i) => (
            <li key={o.id}>
              <MediaCard
                href={`/offers/${o.slug}`}
                title={o.title}
                imageKey={o.image_key}
                imageLabel="Offer photo"
                viewTransitionName={`offer-${o.id}`}
                priority={i < 3}
                badges={o.valid_until ? <Badge className="bg-white text-ink">Until {formatDate(o.valid_until, { month: "short", day: "numeric" })}</Badge> : undefined}
                excerpt={o.excerpt}
                footer="View offer"
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<BadgePercent aria-hidden />} title="No offers right now" body="When TravelXM publishes a promotion it appears here, with its end date." />
      )}
    </Page>
  );
}
