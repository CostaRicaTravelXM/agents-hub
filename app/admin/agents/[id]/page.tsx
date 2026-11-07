import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award } from "lucide-react";
import { isAdmin, requireStaff, ROLE_LABEL } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader, Kpi, Panel, Table, Td, Th } from "@/components/admin/ui";
import { RoleSelect } from "@/components/admin/role-select";
import { Avatar } from "@/components/shell/user-menu";
import { Badge, ProgressBar } from "@/components/ui/surface";
import { formatCompactDuration, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Agent" };

const EVENT_LABEL: Record<string, string> = {
  course_view: "Viewed course",
  enroll: "Enrolled in",
  lesson_start: "Opened lesson",
  lesson_complete: "Completed lesson",
  quiz_submit: "Submitted quiz",
  course_complete: "Completed course",
  certificate_issued: "Earned certificate",
  resource_download: "Downloaded resource",
  group_join: "Joined a group",
};

export default async function AgentPage({ params }: PageProps<"/admin/agents/[id]">) {
  const viewer = await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: person }, { data: summary }, { data: enrollments }, { data: certs }, { data: groups }, { data: events }, { data: crm }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("agent_summary").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("enrollments")
      .select("id, enrolled_at, completed_at, progress_pct, last_activity_at, course:courses(id, title, slug)")
      .eq("user_id", id)
      .order("last_activity_at", { ascending: false, nullsFirst: false }),
    supabase.from("certificates").select("code, course_title, issued_at").eq("user_id", id).order("issued_at", { ascending: false }),
    supabase.from("group_members").select("created_at, group:groups(id, name)").eq("user_id", id),
    supabase
      .from("learning_events")
      .select("id, event, created_at, course:courses(title), lesson:lessons(title)")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase.from("hub_crm_leads").select("sent_at, attempts, last_error").eq("user_id", id).maybeSingle(),
  ]);
  if (!person) notFound();

  const crmStatus = crm?.sent_at
    ? `Sent ${formatDate(crm.sent_at)}`
    : crm?.last_error
      ? `Not sent after ${crm.attempts} ${crm.attempts === 1 ? "try" : "tries"}: ${crm.last_error}`
      : "Not sent yet";

  return (
    <>
      <AdminHeader back={{ href: "/admin/agents", label: "Agents" }} title={person.full_name ?? person.email} description={ROLE_LABEL[person.role]} />

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel>
            <div className="flex items-center gap-4">
              <Avatar name={person.full_name} url={person.avatar_url} size={56} />
              <div className="min-w-0">
                <p className="truncate font-ui text-[17px] font-semibold text-ink">{person.full_name ?? "No name yet"}</p>
                <p className="truncate text-[14px] text-muted">{person.email}</p>
              </div>
            </div>
            <dl className="mt-5 space-y-3 border-t border-line pt-5 text-[14px]">
              {[
                ["Agency", person.is_independent ? "Independent agent" : person.company],
                ["Zoho CRM", crmStatus],
                ["Job title", person.job_title],
                ["Country", person.country],
                ["Phone", person.phone],
                ["Registered", formatDate(person.created_at)],
                ["Last seen", person.last_seen_at ? formatDate(person.last_seen_at) : "–"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right text-ink">{v || "–"}</dd>
                </div>
              ))}
            </dl>
            {isAdmin(viewer.profile) ? (
              <div className="mt-5 border-t border-line pt-5">
                <RoleSelect userId={person.id} role={person.role} />
              </div>
            ) : null}
          </Panel>
          <Panel title="Groups">
            {groups?.length ? (
              <ul className="space-y-2">
                {groups.map((g) =>
                  g.group ? (
                    <li key={g.group.id}>
                      <Link href={`/admin/groups/${g.group.id}`} className="font-semibold text-ink hover:text-link">
                        {g.group.name}
                      </Link>
                      <span className="text-[13px] text-muted"> · since {formatDate(g.created_at)}</span>
                    </li>
                  ) : null,
                )}
              </ul>
            ) : (
              <p className="text-[14px] text-muted">Not in any group.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Courses" value={`${summary?.completed_courses ?? 0}/${summary?.enrollments ?? 0}`} detail="completed" />
            <Kpi label="Avg progress" value={`${Math.round(Number(summary?.avg_progress ?? 0))}%`} />
            <Kpi label="Learning time" value={formatCompactDuration(Number(summary?.learning_seconds ?? 0))} />
            <Kpi label="Certificates" value={summary?.certificates ?? 0} />
          </div>

          <Panel title="Course progress">
            {enrollments?.length ? (
              <Table className="shadow-none">
                <thead>
                  <tr>
                    <Th>Course</Th>
                    <Th>Progress</Th>
                    <Th>Enrolled</Th>
                    <Th>Last activity</Th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id}>
                      <Td>
                        <Link href={`/admin/courses/${e.course?.id}?tab=analytics`} className="font-semibold text-ink hover:text-link">
                          {e.course?.title}
                        </Link>
                        {e.completed_at ? (
                          <Badge tone="success" className="ml-2">
                            Done
                          </Badge>
                        ) : null}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <ProgressBar value={Number(e.progress_pct)} className="w-24" label="Progress" />
                          <span className="tabular-nums">{Math.round(Number(e.progress_pct))}%</span>
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-muted">{formatDate(e.enrolled_at)}</Td>
                      <Td className="whitespace-nowrap text-muted">{e.last_activity_at ? formatDate(e.last_activity_at) : "–"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-[14px] text-muted">Not enrolled in any course yet.</p>
            )}
          </Panel>

          {certs?.length ? (
            <Panel title="Certificates">
              <ul className="space-y-2">
                {certs.map((c) => (
                  <li key={c.code} className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-pill bg-toucan text-black">
                      <Award aria-hidden className="size-4 stroke-[2]" />
                    </span>
                    <span className="flex-1 text-[14px]">
                      <span className="font-semibold text-ink">{c.course_title}</span>
                      <span className="text-muted"> · {formatDate(c.issued_at)}</span>
                    </span>
                    <a href={`/verify/${c.code}`} target="_blank" rel="noopener noreferrer" className="xm-link font-ui text-[13px] font-semibold">
                      {c.code}
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Recent activity">
            {events?.length ? (
              <ol className="space-y-3 font-alt text-[14px]">
                {events.map((ev) => (
                  <li key={ev.id} className="flex gap-3">
                    <span className="w-24 shrink-0 text-muted">{formatDate(ev.created_at, { month: "short", day: "numeric" })}</span>
                    <span className="text-body">
                      {EVENT_LABEL[ev.event] ?? ev.event}{" "}
                      <span className="font-semibold text-ink">{ev.lesson?.title ?? ev.course?.title ?? ""}</span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[14px] text-muted">No activity yet.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
