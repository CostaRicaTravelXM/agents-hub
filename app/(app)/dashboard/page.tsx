import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, PlayCircle } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getCatalog, getCourseDetail } from "@/lib/queries";
import { hubCounts, listCurrentOffers, listFamTrips } from "@/lib/hub/queries";
import { famTripTiming } from "@/lib/hub/fam";
import { lessonHref, nextLesson } from "@/lib/course";
import { HOME_MODULES } from "@/components/shell/nav-config";
import { Page } from "@/components/shell/app-shell";
import { ModuleTile } from "@/components/hub/module-tile";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/surface";
import { Cover } from "@/components/learning/cover";
import { firstName, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

function SectionTitle({ id, title, href, label }: { id: string; title: string; href: string; label: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 id={id} className="xm-title-sm">
        {title}
      </h2>
      <Link href={href} aria-label={label} className="inline-flex min-h-11 shrink-0 items-center font-ui text-[16px] font-semibold text-link hover:text-link-hover">
        See all
      </Link>
    </div>
  );
}

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const [catalog, counts, trips, offers] = await Promise.all([getCatalog(viewer.id), hubCounts(), listFamTrips(), listCurrentOffers()]);

  const inProgress = catalog
    .filter((c) => c.enrollment && !c.enrollment.completed_at)
    .sort((a, b) => (b.enrollment!.last_activity_at ?? b.enrollment!.enrolled_at).localeCompare(a.enrollment!.last_activity_at ?? a.enrollment!.enrolled_at));
  const current = inProgress[0] ?? null;
  const currentDetail = current ? await getCourseDetail(current.slug, viewer.id) : null;
  const upNext = currentDetail ? nextLesson(currentDetail.modules, currentDetail.enrollment?.last_lesson_id) : null;
  const suggested = current ? null : (catalog.find((c) => c.featured && !c.enrollment) ?? catalog.find((c) => !c.enrollment) ?? null);

  const countFor = (id: string) =>
    id === "learning" ? catalog.length : id === "fam" ? counts.famTrips : id === "offers" ? counts.offers : id === "books" ? counts.books : null;

  const lead = current && upNext ? current : suggested;

  return (
    <Page>
      <header className="xm-reveal mb-5 md:mb-7">
        <h1 className="xm-title">Hi {firstName(viewer.profile.full_name)}</h1>
        <p className="xm-lead mt-1.5 text-muted">What would you like to do today?</p>
      </header>

      {/* The one main action on Home. */}
      {lead ? (
        <section aria-label={current && upNext ? "Continue learning" : "Start learning"} className="xm-reveal mb-8 md:mb-10">
          <Link
            href={current && upNext ? lessonHref(current.slug, upNext.id) : `/courses/${lead.slug}`}
            className="group relative block h-[320px] overflow-hidden rounded-xl bg-inverse md:h-[360px]"
          >
            <div className="xm-veil xm-veil-tall absolute inset-0">
              <Cover imageKey={lead.cover_key} alt="" priority sizes="(min-width: 1024px) 900px, 100vw" tone="dark" zoomOnHover />
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 p-5 md:p-8">
              <h2 className="max-w-2xl font-ui text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-white md:text-[36px]">{lead.title}</h2>
              {current && upNext ? (
                <>
                  <p className="mt-2 line-clamp-1 text-[16px] text-white/90">Up next: {upNext.title}</p>
                  <div className="mt-3 flex max-w-md items-center gap-3">
                    <ProgressBar value={current.enrollment!.progress_pct} label="Course progress" tone="cloudy" className="bg-white/30" />
                    <span className="shrink-0 font-ui text-[15px] font-semibold text-white tabular-nums">{Math.round(current.enrollment!.progress_pct)}%</span>
                  </div>
                </>
              ) : lead.subtitle ? (
                <p className="mt-2 line-clamp-2 max-w-xl text-[16px] text-white/90">{lead.subtitle}</p>
              ) : null}
              <Button asChild size="lg" className="mt-4 w-full sm:w-auto">
                <span>
                  <PlayCircle aria-hidden /> {current && upNext ? "Continue learning" : "Start learning"}
                </span>
              </Button>
            </div>
          </Link>
        </section>
      ) : null}

      {/* Every module, one tile each */}
      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="sr-only">
          Everything in the Hub
        </h2>
        <ul className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
          {HOME_MODULES.map((item) => (
            <li key={item.id}>
              <ModuleTile item={item} count={countFor(item.id)} />
            </li>
          ))}
        </ul>
      </section>

      {trips.length ? (
        <section aria-labelledby="trips-heading" className="mt-10 md:mt-14">
          <SectionTitle id="trips-heading" title="FAM trips" href="/fam-trips" label="See all FAM trips" />
          {/* Phones scroll sideways with the next trip showing, and "See all" is always there. */}
          <ul className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0">
            {trips.slice(0, 6).map((t, i) => (
              <li key={t.id} className={`w-[72%] max-w-[300px] shrink-0 snap-start md:w-auto md:max-w-none ${i > 2 ? "md:hidden" : ""}`}>
                <Link href={`/fam-trips/${t.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-inverse">
                  <div className="xm-veil xm-veil-tall absolute inset-0">
                    <Cover imageKey={t.image_key} alt={t.image_alt ?? ""} label="Trip photo" tone="dark" sizes="(min-width: 768px) 300px, 72vw" zoomOnHover />
                  </div>
                  <span className="absolute inset-x-0 bottom-0 z-10 block p-4">
                    <span className="block font-ui text-[18px] leading-[1.2] font-semibold text-white">{t.title}</span>
                    <span className="mt-1 block text-[15px] text-white/90">
                      {famTripTiming(t)}, {t.nights} nights
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {offers.length ? (
        <section aria-labelledby="offers-heading" className="mt-10 md:mt-14">
          <SectionTitle id="offers-heading" title="Current offers" href="/offers" label="See all current offers" />
          <ul className="divide-y divide-line">
            {offers.slice(0, 3).map((o) => (
              <li key={o.id}>
                <Link href={`/offers/${o.slug}`} className="group flex min-h-[96px] items-center gap-4 py-3">
                  <span className="relative block size-[72px] shrink-0 overflow-hidden rounded-md bg-sunken">
                    <Cover imageKey={o.image_key} alt="" label="Offer" sizes="72px" zoomOnHover />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block font-ui text-[17px] leading-snug font-semibold text-ink">{o.title}</span>
                    <span className="mt-1 block text-[15px] text-muted">
                      {o.valid_until ? `Until ${formatDate(o.valid_until, { month: "short", day: "numeric" })}` : "No end date"}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 stroke-[2] text-muted transition-[translate] duration-200 ease-standard group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Page>
  );
}
