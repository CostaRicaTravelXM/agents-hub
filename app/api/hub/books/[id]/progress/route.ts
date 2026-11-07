import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Remembers where the reader left off, so the same page opens on another device. */
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/hub/books/[id]/progress">) {
  const { id } = await ctx.params;
  const parsed = z.object({ page: z.number().int().min(1).max(5000) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const { error } = await supabase
    .from("hub_book_progress")
    .upsert({ user_id: userId, book_id: id, page: parsed.data.page, updated_at: new Date().toISOString() }, { onConflict: "user_id,book_id" });
  if (error) return NextResponse.json({ error: "Not saved" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
