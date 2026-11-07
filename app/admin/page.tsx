import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader, Kpi, Panel, Table, Td, Th } from "@/components/admin/ui";
import { BarList, WeekBars } from "@/components/learning/week-bars";
import { Button } from "@/components/ui/button";
import { Badge, ProgressBar } from "@/components/ui/surface";
import { cn, formatCompactDuration, formatDate, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

type Overview = {
  registered_agents: number;
  new_agents: number;
  active_learners: number;
  enrollments_total: number;
  enrollments: number;
  completions: number;
  completion_rate_total: number;
  completion_rate: number;
  avg_progress: number;
  learning_seconds: number;
  avg_learning_seconds: number;
  certified_agents: number;
  certificates_issued: number;
  signups_by_week: { week: string; count: number }[];
  learning_minutes_by_week: { week: string; minutes: number }[];
  top_destinations: { id: string; name: string; views: number }[];
  top_lessons: { id: string; title: string; type: string; course_title: string; course_id: string; views: number; viewers: number }[];
  courses: {
    id: string;
    title: string;
    slug: string;
    status: string;
    visibility: string;
    enrolled: number;
    completed: number;
    completion_rate: number;
    avg_progress: number;
    views: number;
  }[];
};

const RANGES = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "365", label: "12 months" },
];

export default async function AdminOverview({ searchParams }: PageProps<"/admin">) {
  await requireStaff();
  const sp = await searchParams;
  const range = RANGES.some((r) => r.id === sp.range) ? String(sp.range) : "30";
  const to = new Date();
  const from = new Date(to.getTime() - Number(range) * 86400000);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_overview", { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) throw error;
  const o = data as unknown as Overview;
  const periodLabel = `last ${RANGES.find((r) => r.id === range)!.label}`;
  const weekLabel = (w: string) => formatDate(`${w}T12:00:00`, { month: "short", day: "numeric" });

  return (
    <>
      <AdminHeader
        title="Learning overview"
        description="How advisors use the courses. Staff accounts are excluded from every number."
        actions={
          <Button asChild variant="secondary" size="sm">
            <a href="/api/admin/export?type=agents">
              <Download aria-hidden /> Export agents CSV
            </a>
          </Button>
        }
      />

      <div role="group" aria-label="Date range" className="mb-6 inline-flex rounded-md border border-line bg-card p-1 shadow-card">
        {RANGES.map((r) => (
          <Link
            key={r.id}
            href={`/admin?range=${r.id}`}
            aria-current={r.id === range ? "true" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-sm px-3 font-ui text-[13px] font-semibold transition-colors duration-120",
              r.id === range ? "bg-ink text-cloudy" : "text-body hover:bg-sunken",
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Kpi label="Registered agents" value={formatNumber(o.registered_agents)} detail={`+${formatNumber(o.new_agents)} in the ${periodLabel}`} />
        <Kpi label="Course enrollments" value={formatNumber(o.enrollments)} detail={`${formatNumber(o.enrollments_total)} all time`} />
        <Kpi label="Completion rate" value={`${o.completion_rate_total}%`} detail={`${formatNumber(o.completions)} completions in the ${periodLabel}`} />
        <Kpi label="Avg learning time" value={formatCompactDuration(o.avg_learning_seconds)} detail={`per active agent, ${periodLabel}`} />
        <Kpi label="Active learners" value={formatNumber(o.active_learners)} detail={periodLabel} />
        <Kpi label="Certified agents" value={formatNumber(o.certified_agents)} detail={`${formatNumber(o.certificates_issued)} certificates in the ${periodLabel}`} />
        <Kpi label="Avg course progress" value={`${o.avg_progress}%`} detail="across all enrollments" />
        <Kpi label="Total learning time" value={formatCompactDuration(o.learning_seconds)} detail={periodLabel} />
      </section>

      <div className="mt-4 grid gap-4 md:mt-6 lg:grid-cols-2">
        <Panel title="New agents per week" description="Registrations, last 12 weeks">
          <WeekBars data={o.signups_by_week.map((w, i, a) => ({ label: weekLabel(w.week), value: w.count, current: i === a.length - 1 }))} unit="agents" label="New agents per week" />
        </Panel>
        <Panel title="Learning minutes per week" description="Time spent in lessons, last 12 weeks">
          <WeekBars data={o.learning_minutes_by_week.map((w, i, a) => ({ label: weekLabel(w.week), value: w.minutes, current: i === a.length - 1 }))} unit="min" label="Learning minutes per week" />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 lg:grid-cols-2">
        <Panel title="Most viewed destinations" description={`Course and lesson views, ${periodLabel}`}>
          <BarList items={o.top_destinations.map((d) => ({ label: d.name, value: d.views }))} unit="views" />
        </Panel>
        <Panel title="Most viewed lessons" description={`Lesson starts, ${periodLabel}`}>
          <BarList
            items={o.top_lessons.map((l) => ({ label: l.title, sublabel: l.course_title, value: l.views }))}
            unit="starts"
          />
        </Panel>
      </div>

      <section aria-labelledby="courses-perf" className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="courses-perf" className="font-ui text-[20px] font-semibold text-ink">
            Course performance
          </h2>
          <p className="text-[13px] text-muted">Open a course to see its drop-off points</p>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Course</Th>
              <Th className="text-right">Views</Th>
              <Th className="text-right">Enrolled</Th>
              <Th className="text-right">Completed</Th>
              <Th>Completion rate</Th>
              <Th className="text-right">Avg progress</Th>
            </tr>
          </thead>
          <tbody>
            {o.courses.map((c) => (
              <tr key={c.id} className="transition-colors duration-120 hover:bg-page">
                <Td>
                  <Link href={`/admin/courses/${c.id}?tab=analytics`} className="font-semibold text-ink hover:text-link">
                    {c.title}
                  </Link>
                  <div className="mt-1 flex gap-1.5">
                    {c.status !== "published" ? <Badge tone="neutral">{c.status}</Badge> : null}
                    {c.visibility === "groups" ? <Badge tone="warning">Groups</Badge> : null}
                  </div>
                </Td>
                <Td className="text-right tabular-nums">{formatNumber(c.views)}</Td>
                <Td className="text-right tabular-nums">{formatNumber(c.enrolled)}</Td>
                <Td className="text-right tabular-nums">{formatNumber(c.completed)}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <ProgressBar value={c.completion_rate} className="w-28" label={`${c.title} completion rate`} />
                    <span className="tabular-nums">{c.completion_rate}%</span>
                  </div>
                </Td>
                <Td className="text-right tabular-nums">{c.avg_progress}%</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
    </>
  );
}
