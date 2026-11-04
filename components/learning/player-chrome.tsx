"use client";

import Link from "next/link";
import { ListTree, X } from "lucide-react";
import type { OutlineModule } from "@/lib/course";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { LessonRow } from "@/components/learning/syllabus";
import { ProgressBar } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export function PlayerSyllabus({
  courseSlug,
  modules,
  activeId,
  className,
}: {
  courseSlug: string;
  modules: OutlineModule[];
  activeId: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      {modules.map((m, i) => (
        <section key={m.id} aria-label={m.title}>
          <div className="px-3 pb-1.5">
            <p className="xm-micro text-muted">Module {i + 1}</p>
            <Link href={`/courses/${courseSlug}/modules/${m.id}`} className="font-ui text-[15px] font-semibold text-ink hover:text-link">
              {m.title}
            </Link>
          </div>
          <div>
            {m.lessons.map((l) => (
              <LessonRow key={l.id} courseSlug={courseSlug} lesson={l} locked={!m.unlocked} active={l.id === activeId} compact />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PlayerTopBar({
  courseSlug,
  courseTitle,
  position,
  total,
  progress,
  modules,
  activeId,
}: {
  courseSlug: string;
  courseTitle: string;
  position: number;
  total: number;
  progress: number;
  modules: OutlineModule[];
  activeId: string;
}) {
  return (
    <header className="xm-glass-header sticky top-0 z-40 border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 items-center gap-3 px-3 md:px-5">
        <Link
          href={`/courses/${courseSlug}`}
          aria-label="Close lesson and return to the course"
          className="grid size-10 shrink-0 place-items-center rounded-md text-ink transition-colors duration-120 hover:bg-sunken"
        >
          <X aria-hidden className="size-5 stroke-[1.75]" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-[15px] font-semibold text-ink">{courseTitle}</p>
          <p className="text-[13px] text-muted">
            Lesson {position} of {total}
          </p>
        </div>
        <div className="hidden w-48 items-center gap-3 md:flex">
          <ProgressBar value={progress} label="Course progress" />
          <span className="font-ui text-[13px] font-semibold text-ink tabular-nums">{Math.round(progress)}%</span>
        </div>
        <Dialog>
          <DialogTrigger
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border-2 border-line-strong px-3 font-ui text-[14px] font-semibold text-ink transition-colors duration-120 hover:bg-sunken lg:hidden"
            aria-label="Show syllabus"
          >
            <ListTree aria-hidden className="size-5 stroke-[1.75]" />
            <span className="hidden sm:inline">Syllabus</span>
          </DialogTrigger>
          <DialogContent title="Syllabus" description={`${Math.round(progress)}% complete`} side="sheet">
            <PlayerSyllabus courseSlug={courseSlug} modules={modules} activeId={activeId} />
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
