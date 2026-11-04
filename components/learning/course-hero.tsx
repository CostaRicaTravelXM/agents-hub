import Link from "next/link";
import { ViewTransition } from "react";
import { ChevronLeft } from "lucide-react";
import { Cover } from "@/components/learning/cover";

export function CourseHero({
  courseId,
  coverKey,
  meta,
  title,
  subtitle,
  back,
}: {
  courseId: string;
  coverKey: string | null;
  meta: string;
  title: string;
  subtitle?: string | null;
  back: { href: string; label: string };
}) {
  return (
    <section className="relative isolate overflow-hidden bg-inverse">
      <div className="xm-veil xm-veil-tall relative h-[380px] md:h-[460px]">
        <ViewTransition name={`cover-${courseId}`}>
          <Cover imageKey={coverKey} alt="" priority sizes="100vw" tone="dark" label="Course photo" />
        </ViewTransition>
      </div>
      <div className="absolute inset-x-0 top-0 z-10">
        <div className="xm-container pt-5">
          <Link
            href={back.href}
            className="inline-flex h-9 items-center gap-1 rounded-md bg-cloudy px-3 font-ui text-[14px] font-semibold text-ink shadow-card transition-colors duration-120 hover:bg-white"
          >
            <ChevronLeft aria-hidden className="size-4 stroke-[2]" /> {back.label}
          </Link>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="xm-container pb-8 md:pb-12">
          <h1 className="max-w-3xl font-display text-[44px] leading-none tracking-[0.005em] text-white uppercase md:text-[72px]">
            {title}
          </h1>
          <p className="xm-meta mt-3">{meta}</p>
          {subtitle ? <p className="mt-4 max-w-2xl text-[17px] leading-[1.55] text-cloudy md:text-[19px]">{subtitle}</p> : null}
        </div>
      </div>
    </section>
  );
}
