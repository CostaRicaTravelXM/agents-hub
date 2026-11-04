import Link from "next/link";
import { ViewTransition } from "react";
import { ArrowRight, Award, Lock, Users } from "lucide-react";
import type { CourseSummary } from "@/lib/queries";
import { LEVEL_LABEL } from "@/lib/course";
import { Badge, Card, ProgressBar } from "@/components/ui/surface";
import { Cover } from "@/components/learning/cover";
import { formatDuration } from "@/lib/utils";

export function courseMeta(c: Pick<CourseSummary, "lessonCount" | "durationSeconds" | "estimated_minutes" | "moduleCount">) {
  const time = c.estimated_minutes ? formatDuration(c.estimated_minutes * 60) : formatDuration(c.durationSeconds);
  return `${c.moduleCount} ${c.moduleCount === 1 ? "module" : "modules"} · ${c.lessonCount} lessons · ${time}`;
}

export function CourseCard({ course, priority }: { course: CourseSummary; priority?: boolean }) {
  const e = course.enrollment;
  const done = Boolean(e?.completed_at);
  const started = Boolean(e) && !done;
  return (
    <Card interactive className="flex h-full flex-col">
      <Link href={`/courses/${course.slug}`} className="flex h-full flex-col rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary focus-visible:ring-inset">
        <div className="relative h-[200px] overflow-hidden bg-sunken">
          <ViewTransition name={`cover-${course.id}`}>
            <Cover imageKey={course.cover_key} alt="" zoomOnHover priority={priority} sizes="(min-width: 1280px) 380px, (min-width: 768px) 45vw, 100vw" />
          </ViewTransition>
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge tone="inverse">{LEVEL_LABEL[course.level]}</Badge>
            {course.visibility === "groups" ? (
              <Badge tone="warning">
                <Users aria-hidden /> Partners
              </Badge>
            ) : null}
            {course.status !== "published" ? (
              <Badge tone="neutral">
                <Lock aria-hidden /> {course.status}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5 md:p-6">
          <h3 className="font-ui text-[20px] leading-[1.25] font-semibold text-ink">{course.title}</h3>
          {course.subtitle ? <p className="mt-1.5 line-clamp-2 text-[15px] text-muted">{course.subtitle}</p> : null}
          <p className="mt-4 text-[13px] text-muted">{[course.category?.name, courseMeta(course)].filter(Boolean).join(" · ")}</p>

          <div className="mt-auto pt-5">
            {started ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between font-ui text-[13px] font-semibold">
                  <span className="text-ink">{Math.round(e!.progress_pct)}% complete</span>
                  <span className="inline-flex items-center gap-1 text-link transition-colors duration-120 group-hover:text-link-hover">
                    Continue <ArrowRight aria-hidden className="size-4 stroke-[2]" />
                  </span>
                </div>
                <ProgressBar value={e!.progress_pct} label={`${course.title} progress`} />
              </div>
            ) : done ? (
              <div className="flex items-center justify-between">
                <Badge tone="success">
                  <Award aria-hidden /> Completed
                </Badge>
                <span className="font-ui text-[13px] font-semibold text-link">Review</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <Badge tone="neutral">Not started</Badge>
                <span className="inline-flex items-center gap-1 font-ui text-[14px] font-semibold text-link transition-colors duration-120 group-hover:text-link-hover">
                  View course <ArrowRight aria-hidden className="size-4 stroke-[2]" />
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
}
