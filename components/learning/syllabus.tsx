import Link from "next/link";
import {
  BookOpenText,
  Check,
  CircleDashed,
  ExternalLink,
  FileDown,
  FileText,
  ListChecks,
  Lock,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import type { LessonType, OutlineLesson, OutlineModule } from "@/lib/course";
import { LESSON_TYPE_LABEL, lessonHref } from "@/lib/course";
import { cn, formatDuration } from "@/lib/utils";

export const LESSON_ICON: Record<LessonType, LucideIcon> = {
  video: PlayCircle,
  pdf: FileText,
  document: FileDown,
  link: ExternalLink,
  reading: BookOpenText,
  quiz: ListChecks,
};

export function LessonStatusIcon({ lesson, locked }: { lesson: Pick<OutlineLesson, "status">; locked?: boolean }) {
  if (locked) return <Lock aria-label="Locked" className="size-4 stroke-[2] text-muted" />;
  if (lesson.status === "completed")
    return (
      <span className="grid size-5 place-items-center rounded-pill bg-olive text-white" aria-label="Completed">
        <Check className="size-3.5 stroke-[3]" aria-hidden />
      </span>
    );
  if (lesson.status === "in_progress") return <CircleDashed aria-label="In progress" className="size-5 stroke-[2] text-sunset" />;
  return <span aria-label="Not started" className="block size-5 rounded-pill border-2 border-line" />;
}

export function LessonRow({
  courseSlug,
  lesson,
  locked,
  active,
  compact,
}: {
  courseSlug: string;
  lesson: OutlineLesson;
  locked: boolean;
  active?: boolean;
  compact?: boolean;
}) {
  const Icon = LESSON_ICON[lesson.type];
  const meta = [LESSON_TYPE_LABEL[lesson.type], lesson.duration_seconds ? formatDuration(lesson.duration_seconds) : null, lesson.is_required ? null : "Optional"]
    .filter(Boolean)
    .join(" · ");
  const inner = (
    <>
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-md transition-colors duration-120",
          active ? "bg-primary text-white" : "bg-sunken text-ink",
        )}
      >
        <Icon aria-hidden className="size-[18px] stroke-[1.75]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block font-ui text-[16px] leading-snug font-semibold", locked ? "text-muted" : "text-ink")}>{lesson.title}</span>
        <span className="mt-0.5 block text-[15px] text-muted">{meta}</span>
      </span>
      <LessonStatusIcon lesson={lesson} locked={locked} />
    </>
  );
  const cls = cn(
    "flex min-h-14 items-center gap-3.5 rounded-md transition-colors duration-120 ease-standard",
    compact ? "px-3 py-2.5" : "px-3 py-3",
    active && "bg-lime/15",
  );
  if (locked) {
    return (
      <div className={cn(cls, "cursor-not-allowed")} aria-disabled="true">
        {inner}
      </div>
    );
  }
  return (
    <Link href={lessonHref(courseSlug, lesson.id)} aria-current={active ? "page" : undefined} className={cn(cls, !active && "hover:bg-sunken")}>
      {inner}
    </Link>
  );
}

export function ModuleBadge({ index, module }: { index: number; module: Pick<OutlineModule, "unlocked" | "completed"> }) {
  if (!module.unlocked)
    return (
      <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-sunken text-muted">
        <Lock aria-hidden className="size-4 stroke-[2]" />
      </span>
    );
  if (module.completed)
    return (
      <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-olive text-white">
        <Check aria-hidden className="size-5 stroke-[2.5]" />
      </span>
    );
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-ink font-display font-bold text-[18px] text-cloudy">{index + 1}</span>
  );
}

export function LockReason({ module }: { module: Pick<OutlineModule, "missing"> }) {
  if (!module.missing.length) return null;
  const names = module.missing.map((m) => m.title);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return (
    <p className="flex items-start gap-2 text-[15px] text-body">
      <Lock aria-hidden className="mt-0.5 size-4 shrink-0 stroke-[2] text-muted" />
      <span>
        Complete <span className="font-semibold text-ink">{list}</span> to unlock this module.
      </span>
    </p>
  );
}

export function Syllabus({ courseSlug, modules }: { courseSlug: string; modules: OutlineModule[] }) {
  return (
    <ol className="space-y-4">
      {modules.map((m, i) => {
        const done = m.lessons.filter((l) => l.status === "completed").length;
        return (
          <li key={m.id} className={"overflow-hidden rounded-lg bg-card shadow-card"}>
            <Link
              href={`/courses/${courseSlug}/modules/${m.id}`}
              className="flex items-start gap-4 p-5 transition-colors duration-120 ease-standard hover:bg-sunken md:p-6"
            >
              <ModuleBadge index={i} module={m} />
              <div className="min-w-0 flex-1">
                <h3 className="font-ui text-[19px] leading-snug font-semibold text-ink">{m.title}</h3>
                <p className="mt-0.5 text-[15px] text-muted">
                  Module {i + 1}, {done} of {m.lessons.length} lessons done
                </p>
                {m.description ? <p className="mt-1.5 text-[15px] text-muted">{m.description}</p> : null}
                {!m.unlocked ? (
                  <div className="mt-3">
                    <LockReason module={m} />
                  </div>
                ) : null}
              </div>
            </Link>
            {m.lessons.length ? (
              <div className="border-t border-line px-2 py-2 md:px-3">
                {m.lessons.map((l) => (
                  <LessonRow key={l.id} courseSlug={courseSlug} lesson={l} locked={!m.unlocked} compact />
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
