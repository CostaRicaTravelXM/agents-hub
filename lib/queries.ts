import "server-only";
import { cache } from "react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import type { OutlineModule, ProgressStatus } from "@/lib/course";

export type CourseSummary = Pick<
  Tables<"courses">,
  | "id"
  | "slug"
  | "title"
  | "subtitle"
  | "description"
  | "cover_key"
  | "level"
  | "estimated_minutes"
  | "featured"
  | "visibility"
  | "status"
  | "sort_order"
  | "published_at"
> & {
  category: { name: string; slug: string; is_destination: boolean } | null;
  moduleCount: number;
  lessonCount: number;
  durationSeconds: number;
  enrollment: Pick<Tables<"enrollments">, "progress_pct" | "completed_at" | "last_lesson_id" | "started_at" | "last_activity_at" | "enrolled_at"> | null;
};

const COURSE_FIELDS =
  "id, slug, title, subtitle, description, cover_key, level, estimated_minutes, featured, visibility, status, sort_order, published_at, category:categories(name, slug, is_destination), modules(id), lessons(id, duration_seconds)";

/** Every course the viewer can see (RLS decides), with their enrollment. */
export const getCatalog = cache(async (userId: string, opts: { includeDrafts?: boolean } = {}): Promise<CourseSummary[]> => {
  const supabase = await createClient();
  let query = supabase.from("courses").select(COURSE_FIELDS).order("sort_order");
  if (!opts.includeDrafts) query = query.eq("status", "published");
  const [{ data: courses, error }, { data: enrollments }] = await Promise.all([
    query,
    supabase
      .from("enrollments")
      .select("course_id, progress_pct, completed_at, last_lesson_id, started_at, last_activity_at, enrolled_at")
      .eq("user_id", userId),
  ]);
  if (error) throw error;
  const byCourse = new Map((enrollments ?? []).map((e) => [e.course_id, e]));
  return (courses ?? []).map((c) => {
    const { modules, lessons, category, ...rest } = c;
    const e = byCourse.get(c.id);
    return {
      ...rest,
      category: category ?? null,
      moduleCount: modules.length,
      lessonCount: lessons.length,
      durationSeconds: lessons.reduce((s, l) => s + (l.duration_seconds ?? 0), 0),
      enrollment: e
        ? {
            progress_pct: Number(e.progress_pct),
            completed_at: e.completed_at,
            last_lesson_id: e.last_lesson_id,
            started_at: e.started_at,
            last_activity_at: e.last_activity_at,
            enrolled_at: e.enrolled_at,
          }
        : null,
    };
  });
});

export type CourseDetail = Awaited<ReturnType<typeof getCourseDetail>>;

/** Course page, module page and player: structure, lock state and the viewer's progress. */
export const getCourseDetail = cache(async (slug: string, userId: string) => {
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select(
      "*, category:categories(name, slug, is_destination), modules(id, title, description, sort_order, created_at, lessons(id, title, type, duration_seconds, sort_order, is_required, summary, module_id, created_at))",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!course) return null;

  const [{ data: outline }, { data: progress }, { data: enrollment }, { data: resources }, { data: certificate }] =
    await Promise.all([
      supabase.rpc("course_outline", { p_course: course.id }),
      supabase.from("lesson_progress").select("lesson_id, status, watch_pct, last_position_seconds").eq("user_id", userId).eq("course_id", course.id),
      supabase.from("enrollments").select("*").eq("user_id", userId).eq("course_id", course.id).maybeSingle(),
      supabase.from("resources").select("*").eq("course_id", course.id).order("sort_order"),
      supabase.from("certificates").select("code, issued_at").eq("user_id", userId).eq("course_id", course.id).maybeSingle(),
    ]);

  const lockState = new Map((outline ?? []).map((o) => [o.module_id, o]));
  const progressByLesson = new Map((progress ?? []).map((p) => [p.lesson_id, p]));
  const sortedModules = [...course.modules].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  const titleById = new Map(sortedModules.map((m) => [m.id, m.title]));

  const modules: OutlineModule[] = sortedModules.map((m) => {
    const lock = lockState.get(m.id);
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      sort_order: m.sort_order,
      unlocked: lock?.unlocked ?? true,
      completed: lock?.completed ?? false,
      missing: (lock?.missing_module_ids ?? []).map((id) => ({ id, title: titleById.get(id) ?? "a previous module" })),
      lessons: [...m.lessons]
        .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
        .map((l) => {
          const p = progressByLesson.get(l.id);
          return {
            id: l.id,
            title: l.title,
            type: l.type,
            duration_seconds: l.duration_seconds,
            sort_order: l.sort_order,
            is_required: l.is_required,
            summary: l.summary,
            module_id: l.module_id,
            status: (p?.status ?? "not_started") as ProgressStatus,
            watch_pct: Number(p?.watch_pct ?? 0),
          };
        }),
    };
  });

  const { modules: _m, category, ...rest } = course;
  void _m;
  return {
    course: rest,
    category: category ?? null,
    modules,
    enrollment: enrollment ? { ...enrollment, progress_pct: Number(enrollment.progress_pct) } : null,
    resources: resources ?? [],
    certificate: certificate ?? null,
    progressByLesson,
  };
});

export async function getMyCertificates(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select("id, code, issued_at, recipient_name, course_title, course:courses(slug, cover_key, level)")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });
  return data ?? [];
}

export async function getLearningTime(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("learning_time_daily").select("day, seconds, course_id").eq("user_id", userId);
  return data ?? [];
}

export type PublicModule = { id: string; title: string; description: string | null; lessonCount: number; durationSeconds: number };
export type PublicCourse = Pick<
  Tables<"courses">,
  "id" | "slug" | "title" | "subtitle" | "cover_key" | "level" | "featured" | "certificate_enabled" | "estimated_minutes"
> & {
  category: string | null;
  modules: PublicModule[];
  lessonCount: number;
  durationSeconds: number;
};

/**
 * Landing page: published courses open to every agent, with their module
 * outline. Read with the service role because visitors are signed out; only
 * public course fields leave this function. Never throws, so a database
 * hiccup cannot take the landing page down.
 */
export const getPublicCatalog = cache(async (): Promise<PublicCourse[]> => {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("courses")
      .select(
        "id, slug, title, subtitle, cover_key, level, featured, certificate_enabled, estimated_minutes, category:categories(name), modules(id, title, description, sort_order, created_at, lessons(id, duration_seconds))",
      )
      .eq("status", "published")
      .eq("visibility", "public")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []).map(({ modules, category, ...c }) => {
      const outline = [...modules]
        .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
        .map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          lessonCount: m.lessons.length,
          durationSeconds: m.lessons.reduce((s, l) => s + (l.duration_seconds ?? 0), 0),
        }));
      return {
        ...c,
        category: category?.name ?? null,
        modules: outline,
        lessonCount: outline.reduce((s, m) => s + m.lessonCount, 0),
        durationSeconds: outline.reduce((s, m) => s + m.durationSeconds, 0),
      };
    });
  } catch (e) {
    console.error("getPublicCatalog", e);
    return [];
  }
});
