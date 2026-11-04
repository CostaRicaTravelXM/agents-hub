import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { isAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LESSON_TYPE_LABEL, type LessonType } from "@/lib/course";
import { AdminHeader, Kpi, Panel, Table, Td, Th } from "@/components/admin/ui";
import { CourseForm } from "@/components/admin/course-form";
import { StructureEditor, type EditorModule } from "@/components/admin/structure-editor";
import { AccessEditor, DangerZone, ResourcesEditor } from "@/components/admin/course-settings";
import { Button } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/surface";
import { cn, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Course builder" };

const TABS = [
  { id: "details", label: "Details" },
  { id: "structure", label: "Modules & lessons" },
  { id: "access", label: "Access" },
  { id: "resources", label: "Resources" },
  { id: "analytics", label: "Analytics" },
] as const;
type Tab = (typeof TABS)[number]["id"];

type Funnel = {
  enrolled: number;
  completed: number;
  lessons: { id: string; title: string; type: LessonType; module_title: string; position: number; is_required: boolean; started: number; completed: number; stalled: number; avg_watch_pct: number }[];
};

function lessonReady(l: { type: LessonType; video_key: string | null; file_key: string | null; external_url: string | null; body: unknown }, quizCount: number) {
  switch (l.type) {
    case "video":
      return Boolean(l.video_key);
    case "pdf":
    case "document":
      return Boolean(l.file_key);
    case "link":
      return Boolean(l.external_url);
    case "reading":
      return JSON.stringify(l.body ?? "").length > 80;
    case "quiz":
      return quizCount > 0;
  }
}

export default async function CourseBuilder({ params, searchParams }: PageProps<"/admin/courses/[id]">) {
  const viewer = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "details";
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select(
      "*, modules(id, title, description, sort_order, created_at, module_requirements!module_requirements_module_id_fkey(required_module_id), lessons(id, title, type, is_required, duration_seconds, sort_order, created_at, video_key, file_key, external_url, body, quizzes(id, quiz_questions(id))))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!course) notFound();

  const modules: EditorModule[] = [...course.modules]
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
    .map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      requires: m.module_requirements.map((r) => r.required_module_id),
      lessons: [...m.lessons]
        .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
        .map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          is_required: l.is_required,
          duration_seconds: l.duration_seconds,
          ready: lessonReady(l, l.quizzes?.quiz_questions.length ?? 0),
        })),
    }));
  const lessonCount = modules.reduce((s, m) => s + m.lessons.length, 0);
  const notReady = modules.reduce((s, m) => s + m.lessons.filter((l) => !l.ready).length, 0);

  const statusTone = { published: "success", draft: "warning", archived: "muted" } as const;

  let body: React.ReactNode = null;
  if (tab === "details") {
    const { data: categories } = await supabase.from("categories").select("id, name").order("sort_order");
    body = (
      <div className="space-y-6">
        <div className="rounded-lg bg-card p-5 shadow-card md:p-8">
          <CourseForm course={course} categories={categories ?? []} />
        </div>
        <Panel title="Danger zone">
          <DangerZone courseId={course.id} title={course.title} isAdmin={isAdmin(viewer.profile)} />
        </Panel>
      </div>
    );
  } else if (tab === "structure") {
    body = <StructureEditor courseId={course.id} initial={modules} />;
  } else if (tab === "access") {
    const [{ data: groups }, { data: assigned }] = await Promise.all([
      supabase.from("groups").select("id, name, group_members(user_id)").order("name"),
      supabase.from("course_groups").select("group_id").eq("course_id", course.id),
    ]);
    body = (
      <div className="rounded-lg bg-card p-5 shadow-card md:p-8">
        <AccessEditor
          courseId={course.id}
          status={course.status}
          visibility={course.visibility}
          groups={(groups ?? []).map((g) => ({ id: g.id, name: g.name, members: g.group_members.length }))}
          selected={(assigned ?? []).map((a) => a.group_id)}
          lessonCount={lessonCount}
        />
      </div>
    );
  } else if (tab === "resources") {
    const { data: resources } = await supabase
      .from("resources")
      .select("id, title, description, file_name, file_size, external_url")
      .eq("course_id", course.id)
      .order("sort_order");
    body = (
      <div className="rounded-lg bg-card p-5 shadow-card md:p-8">
        <ResourcesEditor courseId={course.id} resources={resources ?? []} />
      </div>
    );
  } else {
    const { data } = await supabase.rpc("course_funnel", { p_course: course.id });
    const f = data as unknown as Funnel;
    const maxStalled = Math.max(1, ...f.lessons.map((l) => l.stalled));
    const worst = [...f.lessons].sort((a, b) => b.stalled - a.stalled)[0];
    body = (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Kpi label="Enrolled agents" value={formatNumber(f.enrolled)} />
          <Kpi label="Completed" value={formatNumber(f.completed)} />
          <Kpi label="Completion rate" value={`${f.enrolled ? Math.round((f.completed / f.enrolled) * 100) : 0}%`} />
          <Kpi label="Biggest drop-off" value={worst?.stalled ? formatNumber(worst.stalled) : "–"} detail={worst?.stalled ? worst.title : "No one is stuck"} />
        </div>
        <Panel
          title="Lesson funnel and drop-off points"
          description="Started and completed count agents. Stalled counts unfinished enrollments whose next required lesson is this one."
        >
          <Table className="shadow-none">
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Lesson</Th>
                <Th className="text-right">Started</Th>
                <Th className="text-right">Completed</Th>
                <Th className="text-right">Avg watched</Th>
                <Th>Stalled here</Th>
              </tr>
            </thead>
            <tbody>
              {f.lessons.map((l) => (
                <tr key={l.id}>
                  <Td className="text-muted tabular-nums">{l.position}</Td>
                  <Td>
                    <Link href={`/admin/lessons/${l.id}`} className="font-semibold text-ink hover:text-link">
                      {l.title}
                    </Link>
                    <p className="text-[13px] text-muted">
                      {l.module_title} · {LESSON_TYPE_LABEL[l.type]}
                      {l.is_required ? "" : " · optional"}
                    </p>
                  </Td>
                  <Td className="text-right tabular-nums">{formatNumber(l.started)}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(l.completed)}</Td>
                  <Td className="text-right tabular-nums">{l.type === "video" ? `${l.avg_watch_pct}%` : "–"}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-32">
                        {l.stalled ? <div className="h-full rounded-r-[4px] bg-olive" style={{ width: `${(l.stalled / maxStalled) * 100}%` }} /> : null}
                      </div>
                      <span className="w-6 font-semibold text-ink tabular-nums">{l.stalled}</span>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
    );
  }

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/courses", label: "Courses" }}
        title={course.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 capitalize">
              <StatusDot tone={statusTone[course.status]} /> {course.status}
            </span>
            {course.visibility === "groups" ? <Badge tone="warning">Groups only</Badge> : <Badge tone="neutral">Everyone</Badge>}
            <span>
              {modules.length} modules · {lessonCount} lessons
            </span>
            {notReady ? <Badge tone="warning">{notReady} lessons need content</Badge> : null}
          </span>
        }
        actions={
          <Button asChild variant="secondary">
            <Link href={`/courses/${course.slug}`} target="_blank">
              <Eye aria-hidden /> Preview as agent
            </Link>
          </Button>
        }
      />
      <nav aria-label="Course builder sections" className="scrollbar-none mb-6 flex gap-6 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/courses/${course.id}?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "relative -mb-px h-11 shrink-0 content-center font-ui text-[15px] font-semibold transition-colors duration-120",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:transition-transform after:duration-200",
              tab === t.id ? "text-ink after:scale-x-100" : "text-muted after:scale-x-0 hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {body}
    </>
  );
}
