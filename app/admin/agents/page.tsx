import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requireStaff, ROLE_LABEL } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader, Table, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, ProgressBar } from "@/components/ui/surface";
import { cn, formatCompactDuration, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Agents" };

const ROLES = [
  { id: "agent", label: "Agents" },
  { id: "staff", label: "Staff" },
  { id: "all", label: "Everyone" },
];

export default async function AgentsPage({ searchParams }: PageProps<"/admin/agents">) {
  await requireStaff();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const role = ROLES.some((r) => r.id === sp.role) ? String(sp.role) : "agent";
  const supabase = await createClient();

  let query = supabase.from("agent_summary").select("*").order("last_activity_at", { ascending: false, nullsFirst: false }).limit(200);
  if (role === "agent") query = query.eq("role", "agent");
  if (role === "staff") query = query.in("role", ["admin", "content_manager"]);
  if (q) {
    const safe = q.replace(/[,()%*\\]/g, " ");
    query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%,company.ilike.%${safe}%,country.ilike.%${safe}%`);
  }
  const { data: people } = await query;

  return (
    <>
      <AdminHeader
        title="Agents"
        description="Every registered advisor, their progress and their certificates."
        actions={
          <Button asChild variant="secondary" size="sm">
            <a href="/api/admin/export?type=enrollments">
              <Download aria-hidden /> Export enrollments CSV
            </a>
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <form className="relative md:w-96" role="search">
          <input type="hidden" name="role" value={role} />
          <label htmlFor="agent-q" className="sr-only">
            Search agents
          </label>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 stroke-[1.75] text-muted" />
          <input
            id="agent-q"
            name="q"
            defaultValue={q}
            placeholder="Name, email, agency or country"
            className="h-11 w-full rounded-pill border border-control bg-card pr-4 pl-11 text-[15px] text-ink placeholder:text-muted focus-visible:border-ink focus-visible:outline-none"
          />
        </form>
        <div role="group" aria-label="Filter by role" className="inline-flex rounded-md border border-line bg-card p-1 shadow-card">
          {ROLES.map((r) => (
            <Link
              key={r.id}
              href={`/admin/agents?role=${r.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={r.id === role ? "true" : undefined}
              className={cn(
                "inline-flex h-8 items-center rounded-sm px-3 font-ui text-[13px] font-semibold transition-colors duration-120",
                r.id === role ? "bg-ink text-cloudy" : "text-body hover:bg-sunken",
              )}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {people?.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Agency</Th>
              <Th className="text-right">Courses</Th>
              <Th>Avg progress</Th>
              <Th className="text-right">Certificates</Th>
              <Th className="text-right">Learning time</Th>
              <Th>Last active</Th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="transition-colors duration-120 hover:bg-page">
                <Td>
                  <Link href={`/admin/agents/${p.id}`} className="font-semibold text-ink hover:text-link">
                    {p.full_name ?? p.email}
                  </Link>
                  <p className="text-[13px] text-muted">{p.email}</p>
                  {p.role !== "agent" && p.role ? <Badge tone="inverse" className="mt-1">{ROLE_LABEL[p.role]}</Badge> : null}
                </Td>
                <Td>
                  {p.company ?? "–"}
                  <p className="text-[13px] text-muted">{p.country}</p>
                </Td>
                <Td className="text-right tabular-nums">
                  {p.completed_courses}/{p.enrollments}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={Number(p.avg_progress ?? 0)} className="w-20" label="Average progress" />
                    <span className="tabular-nums">{Math.round(Number(p.avg_progress ?? 0))}%</span>
                  </div>
                </Td>
                <Td className="text-right tabular-nums">{p.certificates}</Td>
                <Td className="text-right tabular-nums">{formatCompactDuration(Number(p.learning_seconds ?? 0))}</Td>
                <Td className="whitespace-nowrap text-muted">{p.last_activity_at ? formatDate(p.last_activity_at) : "Not started"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState title={q ? "No one matches" : "No agents yet"} body={q ? "Try another name, email or agency." : "Agents appear here as soon as they register."} />
      )}
    </>
  );
}
