"use client";

import { useState } from "react";
import Link from "next/link";
import { ListVideo, X } from "lucide-react";
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
    <div className={cn("space-y-6", className)}>
      {modules.map((m, i) => (
        <section key={m.id} aria-label={m.title}>
          <div className="px-3 pb-2">
            <p className="text-[15px] text-muted">Module {i + 1}</p>
            <Link href={`/courses/${courseSlug}/modules/${m.id}`} className="font-ui text-[17px] font-semibold text-ink hover:text-link">
              {m.title}
            </Link>
          </div>
          <div className="space-y-1">
            {m.lessons.map((l) => (
              <LessonRow key={l.id} courseSlug={courseSlug} lesson={l} locked={!m.unlocked} active={l.id === activeId} compact />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * The bar above the lesson. The list of modules stays out of the way so the video
 * can take the whole screen; one clearly named button opens it.
 */
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
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-page pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 items-center gap-2 px-3 md:gap-3 md:px-5">
        <Link
          href={`/courses/${courseSlug}`}
          aria-label="Close lesson and return to the course"
          className="grid size-11 shrink-0 place-items-center rounded-pill bg-sunken text-ink transition-colors duration-120 ease-standard hover:bg-line"
        >
          <X aria-hidden className="size-5 stroke-[1.75]" />
        </Link>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate font-ui text-[15px] leading-tight font-semibold text-ink md:text-[16px]">{courseTitle}</p>
          <p className="mt-0.5 text-[15px] leading-tight text-muted">
            Lesson {position} of {total}
          </p>
        </div>
        <div className="hidden w-48 items-center gap-3 md:flex">
          <ProgressBar value={progress} label="Course progress" />
          <span className="font-ui text-[15px] font-semibold text-ink tabular-nums">{Math.round(progress)}%</span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            aria-label="Course content"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-pill bg-ink px-4 font-ui text-[15px] font-semibold text-white transition-colors duration-120 ease-standard hover:bg-stone"
          >
            <ListVideo aria-hidden className="size-5 stroke-[1.75]" />
            <span className="sm:hidden">Lessons</span>
            <span className="hidden sm:inline">Course content</span>
          </DialogTrigger>
          <DialogContent title="Course content" description={`${Math.round(progress)}% complete`} side="panel">
            {/* Choosing a lesson closes the panel straight away, before the next page arrives. */}
            <div
              onClickCapture={(e) => {
                if ((e.target as HTMLElement).closest("a")) setOpen(false);
              }}
            >
              <PlayerSyllabus courseSlug={courseSlug} modules={modules} activeId={activeId} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
