import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Check } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getCatalog, getLearningTime, getMyCertificates } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { Stat } from "@/components/learning/stat";
import { WeekBars } from "@/components/learning/week-bars";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, ProgressBar, SectionHeading } from "@/components/ui/surface";
import { formatCompactDuration, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Progress" };

function weekStart(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

export default async function ProgressPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [catalog, time, certificates, { data: lessons }, { data: attempts }] = await Promise.all([
    getCatalog(viewer.id),
    getLearningTime(viewer.id),
    getMyCertificates(viewer.id),
    supabase.from("lesson_progress").select("status").eq("user_id", viewer.id),
    supabase
      .from("quiz_attempts")
      .select("score, passed, created_at, quiz:quizzes(lesson:lessons(title, course:courses(title, slug)))")
      .eq("user_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const enrolled = catalog
    .filter((c) => c.enrollment)
    .sort((a, b) => (b.enrollment!.last_activity_at ?? "").localeCompare(a.enrollment!.last_activity_at ?? ""));
  const completedLessons = (lessons ?? []).filter((l) => l.status === "completed").length;
  const totalSeconds = time.reduce((s, t) => s + t.seconds, 0);

  const thisWeek = weekStart(new Date());
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - (7 - i) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const seconds = time
      .filter((t) => {
        const d = new Date(`${t.day}T12:00:00`);
        return d >= start && d < end;
      })
      .reduce((s, t) => s + t.seconds, 0);
    return { label: formatDate(start, { month: "short", day: "numeric" }), value: Math.round(seconds / 60), current: i === 7 };
  });
  const weekMinutes = weeks[7].value;

  return (
    <Page className="pt-6 md:pt-8">
      <PageHeader title="Progress" lead="Everything you have started, finished and scored, in one place." />

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        <Stat label="Learning time" value={formatCompactDuration(totalSeconds)} detail={`${weekMinutes} min this week`} />
        <Stat label="Lessons done" value={completedLessons} detail="across all courses" />
        <Stat label="Courses" value={`${enrolled.filter((c) => c.enrollment!.completed_at).length}/${enrolled.length}`} detail="completed" />
        <Stat label="Certificates" value={certificates.length} detail="earned" />
      </section>

      <section aria-labelledby="time-heading" className="mt-6 rounded-lg bg-card p-5 shadow-card md:mt-8 md:p-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="time-heading" className="font-ui text-[20px] font-semibold text-ink">
              Minutes of learning per week
            </h2>
            <p className="mt-0.5 text-[15px] text-muted">Last 8 weeks</p>
          </div>
        </div>
        <WeekBars data={weeks} />
      </section>

      <section aria-labelledby="courses-heading" className="mt-14 md:mt-20">
        <SectionHeading id="courses-heading" title="Course progress" />
        {enrolled.length ? (
          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-lg bg-card shadow-card">
            {enrolled.map((c) => {
              const e = c.enrollment!;
              return (
                <li key={c.id}>
                  <Link
                    href={`/courses/${c.slug}`}
                    className="group grid gap-3 p-5 transition-colors duration-120 hover:bg-sunken md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center md:gap-8 md:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-ui text-[16px] font-semibold text-ink group-hover:text-link">{c.title}</p>
                      <p className="text-[15px] text-muted">
                        {e.completed_at
                          ? `Completed ${formatDate(e.completed_at)}`
                          : e.last_activity_at
                            ? `Last studied ${formatDate(e.last_activity_at)}`
                            : `Enrolled ${formatDate(e.enrolled_at)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressBar value={e.progress_pct} label={`${c.title} progress`} />
                      <span className="w-11 shrink-0 text-right font-ui text-[15px] font-semibold text-ink tabular-nums">
                        {Math.round(e.progress_pct)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      {e.completed_at ? (
                        <Badge tone="success">
                          <Check aria-hidden /> Done
                        </Badge>
                      ) : (
                        <Badge tone="highlight">In progress</Badge>
                      )}
                      <ArrowRight aria-hidden className="size-5 stroke-[2] text-muted transition-transform duration-200 group-hover:translate-x-1" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            className="mt-6"
            icon={<BookOpen aria-hidden />}
            title="Nothing to track yet"
            body="Open any lesson and your progress starts recording automatically."
            action={
              <Button asChild>
                <Link href="/courses">Browse masterclasses</Link>
              </Button>
            }
          />
        )}
      </section>

      {attempts?.length ? (
        <section aria-labelledby="quiz-heading" className="mt-14 md:mt-20">
          <SectionHeading id="quiz-heading" title="Quiz results" />
          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-lg bg-card shadow-card">
            {attempts.map((a, i) => {
              const lesson = a.quiz?.lesson;
              return (
                <li key={i} className="flex items-center gap-4 p-5 md:px-6">
                  <span className="w-20 shrink-0 font-display font-bold text-[28px] leading-none text-ink">{Math.round(Number(a.score))}%</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-[15px] font-semibold text-ink">{lesson?.title ?? "Quiz"}</p>
                    <p className="truncate text-[15px] text-muted">
                      {lesson?.course?.title}, {formatDate(a.created_at)}
                    </p>
                  </div>
                  <Badge tone={a.passed ? "success" : "danger"}>{a.passed ? "Passed" : "Not passed"}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </Page>
  );
}
