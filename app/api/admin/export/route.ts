import { NextResponse, type NextRequest } from "next/server";
import { getViewer, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function csv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Neutralise spreadsheet formula injection and quote everything that needs it.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\r\n");
}

/** Staff CSV exports for reporting outside the Hub. */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || !isStaff(viewer.profile)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const type = request.nextUrl.searchParams.get("type");
  const supabase = await createClient();

  let rows: Record<string, unknown>[] = [];
  let name = "export";
  if (type === "agents") {
    const { data } = await supabase.from("agent_summary").select("*").eq("role", "agent").order("created_at");
    rows = (data ?? []).map((a) => ({
      name: a.full_name,
      email: a.email,
      company: a.company,
      country: a.country,
      registered: a.created_at,
      last_activity: a.last_activity_at,
      enrollments: a.enrollments,
      completed_courses: a.completed_courses,
      certificates: a.certificates,
      learning_minutes: Math.round(Number(a.learning_seconds ?? 0) / 60),
      avg_progress_pct: a.avg_progress,
    }));
    name = "travelxm-academy-agents";
  } else if (type === "enrollments") {
    const { data } = await supabase
      .from("enrollments")
      .select("enrolled_at, completed_at, progress_pct, last_activity_at, profile:profiles(full_name, email, company, role), course:courses(title)");
    rows = (data ?? [])
      .filter((e) => e.profile?.role === "agent")
      .map((e) => ({
        agent: e.profile?.full_name,
        email: e.profile?.email,
        company: e.profile?.company,
        course: e.course?.title,
        enrolled: e.enrolled_at,
        progress_pct: e.progress_pct,
        completed: e.completed_at,
        last_activity: e.last_activity_at,
      }));
    name = "travelxm-academy-enrollments";
  } else {
    return NextResponse.json({ error: "Unknown export" }, { status: 400 });
  }

  return new NextResponse(`﻿${csv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
