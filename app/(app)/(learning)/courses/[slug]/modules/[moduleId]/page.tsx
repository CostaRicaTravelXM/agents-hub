import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft, PlayCircle } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getCourseDetail } from "@/lib/queries";
import { lessonHref } from "@/lib/course";
import { Page } from "@/components/shell/app-shell";
import { LessonRow, LockReason, ModuleBadge } from "@/components/learning/syllabus";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/surface";
import { formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Module" };

export default async function ModulePage({ params }: PageProps<"/courses/[slug]/modules/[moduleId]">) {
  const { slug, moduleId } = await params;
  const viewer = await requireViewer();
  const detail = await getCourseDetail(slug, viewer.id);
  if (!detail) notFound();
  const index = detail.modules.findIndex((m) => m.id === moduleId);
  if (index < 0) notFound();
  const mod = detail.modules[index];
  const prev = detail.modules[index - 1];
  const nextMod = detail.modules[index + 1];

  const done = mod.lessons.filter((l) => l.status === "completed").length;
  const pct = mod.lessons.length ? (done / mod.lessons.length) * 100 : 0;
  const seconds = mod.lessons.reduce((s, l) => s + (l.duration_seconds ?? 0), 0);
  const firstOpen = mod.lessons.find((l) => l.status !== "completed") ?? mod.lessons[0];

  return (
    <Page className="max-w-[880px]">
      <Link href={`/courses/${slug}`} className="inline-flex h-11 items-center gap-1 rounded-pill bg-sunken pr-4 pl-2.5 font-ui text-[15px] font-semibold text-ink transition-colors duration-120 ease-standard hover:bg-line">
        <ChevronLeft aria-hidden className="size-4 stroke-[2]" /> {detail.course.title}
      </Link>

      <header className="xm-reveal mt-6 flex items-start gap-5">
        <ModuleBadge index={index} module={mod} />
        <div className="min-w-0">
          <h1 className="xm-title">{mod.title}</h1>
          <p className="mt-3 font-ui text-[15px] font-semibold text-muted">
            Module {index + 1} of {detail.modules.length}, {mod.lessons.length} {mod.lessons.length === 1 ? "lesson" : "lessons"}
          </p>
          {mod.description ? <p className="xm-lead mt-4 text-muted">{mod.description}</p> : null}
        </div>
      </header>

      <div className="mt-8 rounded-lg bg-card p-5 shadow-card md:p-6">
        {mod.unlocked ? (
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-ui text-[15px] font-semibold text-ink">
                {done} of {mod.lessons.length} lessons complete, {formatDuration(seconds)}
              </p>
              <ProgressBar value={pct} className="mt-3 max-w-md" label="Module progress" />
            </div>
            {firstOpen ? (
              <Button asChild size="lg">
                <Link href={lessonHref(slug, firstOpen.id)}>
                  <PlayCircle aria-hidden /> {done === 0 ? "Start module" : done === mod.lessons.length ? "Review module" : "Continue module"}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="font-ui text-[17px] font-semibold text-ink">This module is locked</p>
            <LockReason module={mod} />
            <div className="flex flex-wrap gap-3">
              {mod.missing.map((m) => (
                <Button key={m.id} asChild variant="secondary" size="sm">
                  <Link href={`/courses/${slug}/modules/${m.id}`}>
                    Go to {m.title} <ArrowRight aria-hidden />
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <section aria-labelledby="lessons-heading" className="mt-10">
        <h2 id="lessons-heading" className="xm-title-sm mb-4">
          Lessons
        </h2>
        <div className="rounded-lg bg-card p-2 shadow-card md:p-3">
          {mod.lessons.map((l) => (
            <div key={l.id}>
              <LessonRow courseSlug={slug} lesson={l} locked={!mod.unlocked} />
              {l.summary ? <p className="-mt-1 pr-4 pb-3 pl-[64px] text-[15px] text-muted">{l.summary}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <nav aria-label="Modules" className="mt-10 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/courses/${slug}/modules/${prev.id}`} className="group flex min-h-[76px] min-w-0 flex-col justify-center rounded-lg border border-line p-4 transition-colors duration-120 ease-standard hover:border-ink">
            <span className="xm-micro text-muted">Previous module</span>
            <span className="block truncate font-ui text-[15px] font-semibold text-ink ">{prev.title}</span>
          </Link>
        ) : null}
        {nextMod ? (
          <Link href={`/courses/${slug}/modules/${nextMod.id}`} className="group flex min-h-[76px] min-w-0 flex-col justify-center rounded-lg border border-line p-4 transition-colors duration-120 ease-standard hover:border-ink sm:col-start-2 sm:text-right">
            <span className="xm-micro text-muted">Next module</span>
            <span className="block truncate font-ui text-[15px] font-semibold text-ink ">{nextMod.title}</span>
          </Link>
        ) : null}
      </nav>
    </Page>
  );
}
