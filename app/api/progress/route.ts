import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const body = z.object({
  lessonId: z.string().uuid(),
  position: z.number().min(0).max(24 * 3600),
  watchPct: z.number().min(0).max(100),
  delta: z.number().min(0).max(600),
});

/** Player heartbeat. Accepts JSON from fetch() and text/plain from navigator.sendBeacon(). */
export async function POST(request: NextRequest) {
  let parsed;
  try {
    parsed = body.safeParse(JSON.parse(await request.text()));
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { lessonId, position, watchPct, delta } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_progress", {
    p_lesson: lessonId,
    p_position_seconds: Math.round(position),
    p_watch_pct: Math.round(watchPct * 100) / 100,
    p_seconds_delta: Math.round(delta),
  });
  if (error) {
    const status = error.code === "28000" ? 401 : error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  const row = data?.[0];
  return NextResponse.json({
    status: row?.status,
    watchPct: Number(row?.watch_pct ?? 0),
    justCompleted: Boolean(row?.just_completed),
  });
}
