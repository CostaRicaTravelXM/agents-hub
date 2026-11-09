import type { Metadata } from "next";
import { PlaneTakeoff } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { listFamTrips } from "@/lib/hub/queries";
import { famTripTiming } from "@/lib/hub/fam";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { MediaCard } from "@/components/hub/media-card";
import { Badge, EmptyState } from "@/components/ui/surface";

export const metadata: Metadata = { title: "FAM Trips" };

export default async function FamTripsPage() {
  await requireViewer();
  const trips = await listFamTrips();
  return (
    <Page>
      <PageHeader
        title="FAM Trips"
        lead="Familiarisation trips for advisors: come and see the hotels, tours and regions you sell."
      />
      {trips.length ? (
        <ul className="grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
          {trips.map((t, i) => (
            <li key={t.id}>
              <MediaCard
                href={`/fam-trips/${t.slug}`}
                title={t.title}
                imageKey={t.image_key}
                imageAlt={t.image_alt ?? ""}
                imageLabel="Trip photo"
                viewTransitionName={`fam-${t.id}`}
                priority={i < 3}
                badges={
                  <>
                    <Badge className="bg-white text-ink">{famTripTiming(t)}</Badge>
                    <Badge className="bg-white text-ink">{t.nights} nights</Badge>
                    {t.audience === "groups" ? <Badge className="bg-white text-ink">Group trip</Badge> : null}
                  </>
                }
                meta={t.regions.join(", ")}
                excerpt={t.summary}
                footer="View trip"
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<PlaneTakeoff aria-hidden />} title="No trips announced yet" body="New FAM trips appear here as soon as TravelXM publishes them." />
      )}
    </Page>
  );
}
