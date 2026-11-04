import type { Enums, Tables } from "@/lib/database.types";

export type LessonType = Enums<"lesson_type">;
export type CourseLevel = Enums<"course_level">;
export type ProgressStatus = Enums<"progress_status">;

export const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  video: "Video",
  pdf: "PDF",
  document: "Document",
  link: "External link",
  reading: "Reading",
  quiz: "Quiz",
};

export const LEVEL_LABEL: Record<CourseLevel, string> = {
  foundation: "Foundation",
  advanced: "Advanced",
  specialist: "Specialist",
};

export type OutlineLesson = Pick<
  Tables<"lessons">,
  "id" | "title" | "type" | "duration_seconds" | "sort_order" | "is_required" | "summary" | "module_id"
> & { status: ProgressStatus; watch_pct: number };

export type OutlineModule = Pick<Tables<"modules">, "id" | "title" | "description" | "sort_order"> & {
  unlocked: boolean;
  completed: boolean;
  missing: { id: string; title: string }[];
  lessons: OutlineLesson[];
};

/** Lessons across modules in syllabus order. */
export function flattenLessons(modules: OutlineModule[]): (OutlineLesson & { moduleIndex: number; locked: boolean })[] {
  return modules.flatMap((m, moduleIndex) => m.lessons.map((l) => ({ ...l, moduleIndex, locked: !m.unlocked })));
}

/** The lesson a learner should open next: the first incomplete lesson in an unlocked module. */
export function nextLesson(modules: OutlineModule[], lastLessonId?: string | null) {
  const all = flattenLessons(modules);
  const firstOpen = all.find((l) => !l.locked && l.status !== "completed");
  if (firstOpen) return firstOpen;
  if (lastLessonId) return all.find((l) => l.id === lastLessonId) ?? all[0];
  return all[0];
}

export function courseDurationSeconds(lessons: { duration_seconds: number | null }[]) {
  return lessons.reduce((sum, l) => sum + (l.duration_seconds ?? 0), 0);
}

export function lessonHref(courseSlug: string, lessonId: string) {
  return `/learn/${courseSlug}/${lessonId}`;
}
