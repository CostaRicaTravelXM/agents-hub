import Link from "next/link";
import { ViewTransition } from "react";
import { Award, Lock, Users } from "lucide-react";
import type { CourseSummary } from "@/lib/queries";
import { Badge, ProgressBar } from "@/components/ui/surface";
import { Cover } from "@/components/learning/cover";
import { CardAction } from "@/components/hub/media-card";
import { formatDuration } from "@/lib/utils";

function courseTime(c: Pick<CourseSummary, "durationSeconds" | "estimated_minutes">) {
  return c.estimated_minutes ? formatDuration(c.estimated_minutes * 60) : formatDuration(c.durationSeconds);
}

export function courseMeta(c: Pick<CourseSummary, "lessonCount" | "durationSeconds" | "estimated_minutes" | "moduleCount">) {
  return `${c.moduleCount} ${c.moduleCount === 1 ? "module" : "modules"} · ${c.lessonCount} ${c.lessonCount === 1 ? "lesson" : "lessons"} · ${courseTime(c)}`;
}

export function CourseCard({ course, priority }: { course: CourseSummary; priority?: boolean }) {
  const e = course.enrollment;
  const done = Boolean(e?.completed_at);
  const started = Boolean(e) && !done;
  return (
    <Link href={`/courses/${course.slug}`} className="group flex h-full flex-col rounded-lg">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-sunken">
        <ViewTransition name={`cover-${course.id}`}>
          <Cover imageKey={course.cover_key} alt="" zoomOnHover priority={priority} sizes="(min-width: 1280px) 380px, (min-width: 768px) 45vw, 100vw" />
        </ViewTransition>
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {course.category ? <Badge className="bg-white text-ink">{course.category.name}</Badge> : null}
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
      <div className="flex flex-1 flex-col px-1 pt-4">
        <h2 className="font-ui text-[20px] leading-[1.25] font-semibold tracking-[-0.01em] text-ink">{course.title}</h2>
        {course.subtitle ? <p className="mt-1.5 line-clamp-2 text-[16px] text-body">{course.subtitle}</p> : null}
        <p className="mt-2 text-[15px] text-muted">
          {course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"}, {courseTime(course)}
        </p>
        {started ? (
          <div className="mt-auto pt-4">
            <p className="mb-2 font-ui text-[15px] font-semibold text-ink">{Math.round(e!.progress_pct)}% complete</p>
            <ProgressBar value={e!.progress_pct} label={`${course.title} progress`} />
          </div>
        ) : done ? (
          <div className="mt-auto pt-4">
            <Badge tone="success">
              <Award aria-hidden /> Completed
            </Badge>
          </div>
        ) : null}
        <CardAction label={started ? "Continue" : done ? "Review" : "View course"} />
      </div>
    </Link>
  );
}
