import Link from "next/link";
import { ViewTransition } from "react";
import { ArrowRight, Play } from "lucide-react";
import { Cover } from "@/components/learning/cover";
import { cn } from "@/lib/utils";

/** The round arrow at the end of a card, next to words that say what tapping does. */
export function CardAction({ label }: { label: string }) {
  return (
    <span className="mt-auto flex items-center justify-between gap-3 pt-4 font-ui text-[16px] font-semibold text-ink">
      {label}
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-pill bg-ink text-white transition-[translate] duration-200 ease-standard group-hover:translate-x-0.5"
      >
        <ArrowRight className="size-5 stroke-[2]" />
      </span>
    </span>
  );
}

/**
 * The card every hub module uses: the photo first, then a title, one line of
 * context and an action that always says what tapping does. Nothing appears only
 * on hover.
 */
export function MediaCard({
  href,
  title,
  imageKey,
  imageAlt = "",
  imageLabel = "Photo",
  ratio = "16/10",
  badges,
  meta,
  excerpt,
  footer = "View details",
  viewTransitionName,
  priority,
  play,
  sizes = "(min-width: 1280px) 380px, (min-width: 768px) 45vw, 100vw",
  heading: Heading = "h2",
}: {
  href: string;
  title: string;
  imageKey: string | null | undefined;
  imageAlt?: string;
  imageLabel?: string;
  ratio?: "16/9" | "16/10" | "3/4";
  badges?: React.ReactNode;
  meta?: string;
  excerpt?: string | null;
  footer?: string;
  viewTransitionName?: string;
  priority?: boolean;
  /** Show a play circle over the photo (videos). */
  play?: boolean;
  sizes?: string;
  /** h2 directly under a page title, h3 inside a titled section. */
  heading?: "h2" | "h3";
}) {
  const ratioClass = ratio === "16/9" ? "aspect-video" : ratio === "3/4" ? "aspect-[3/4]" : "aspect-[16/10]";
  const cover = <Cover imageKey={imageKey} alt={imageAlt} label={imageLabel} zoomOnHover priority={priority} sizes={sizes} />;
  return (
    <Link href={href} className="group flex h-full flex-col rounded-lg">
      <div className={cn("relative w-full overflow-hidden rounded-lg bg-sunken", ratioClass)}>
        {viewTransitionName ? <ViewTransition name={viewTransitionName}>{cover}</ViewTransition> : cover}
        {badges ? <div className="absolute top-3 left-3 flex flex-wrap gap-2">{badges}</div> : null}
        {play ? (
          <span
            aria-hidden
            className="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-pill bg-primary text-white shadow-raised"
          >
            <Play className="ml-0.5 size-6 fill-current stroke-[1.5]" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-1 pt-4">
        <Heading className="font-ui text-[20px] leading-[1.25] font-semibold tracking-[-0.01em] text-ink">{title}</Heading>
        {meta ? <p className="mt-1.5 text-[15px] text-muted">{meta}</p> : null}
        {excerpt ? <p className="mt-2 line-clamp-2 text-[16px] text-body">{excerpt}</p> : null}
        <CardAction label={footer} />
      </div>
    </Link>
  );
}
