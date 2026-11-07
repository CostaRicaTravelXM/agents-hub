import Link from "next/link";
import { ViewTransition } from "react";
import { ChevronLeft } from "lucide-react";
import { Cover } from "@/components/learning/cover";

/**
 * Top of every detail page: the photo edge to edge, the way back always visible
 * on it, and a white sheet rising over the photo with the title.
 */
export function DetailHero({
  back,
  imageKey,
  imageAlt = "",
  imageLabel = "Photo",
  meta,
  title,
  subtitle,
  viewTransitionName,
}: {
  back: { href: string; label: string };
  imageKey: string | null | undefined;
  imageAlt?: string;
  imageLabel?: string;
  /** Short facts separated by " · ". Each becomes its own pill. */
  meta?: string;
  title: string;
  subtitle?: string | null;
  viewTransitionName?: string;
}) {
  const cover = <Cover imageKey={imageKey} alt={imageAlt} priority sizes="100vw" tone="dark" label={imageLabel} />;
  const facts = meta ? meta.split(" · ").filter(Boolean) : [];
  return (
    <section className="relative isolate">
      <div className="relative h-[280px] overflow-hidden bg-inverse md:h-[400px] lg:h-[min(400px,42dvh)]">
        {viewTransitionName ? <ViewTransition name={viewTransitionName}>{cover}</ViewTransition> : cover}
        <div className="absolute inset-x-0 top-0 z-10">
          <div className="xm-container pt-[calc(1rem+env(safe-area-inset-top))] md:pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-6">
            <Link
              href={back.href}
              className="inline-flex h-11 items-center gap-1 rounded-pill bg-white pr-4 pl-2.5 font-ui text-[15px] font-semibold text-ink shadow-sticker focus-visible:outline-white transition-colors duration-120 ease-standard hover:bg-sunken"
            >
              <ChevronLeft aria-hidden className="size-5 stroke-[2]" /> {back.label}
            </Link>
          </div>
        </div>
      </div>
      <div className="relative z-10 -mt-8 rounded-t-xl bg-page pt-7 md:-mt-10 md:pt-10">
        <div className="xm-container">
          <h1 className="xm-title max-w-4xl">{title}</h1>
          {facts.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {facts.map((f) => (
                <li key={f} className="inline-flex min-h-8 items-center rounded-pill bg-sunken px-3 font-ui text-[15px] font-medium text-ink">
                  {f}
                </li>
              ))}
            </ul>
          ) : null}
          {subtitle ? <p className="xm-lead mt-4 max-w-2xl text-muted">{subtitle}</p> : null}
        </div>
      </div>
    </section>
  );
}
