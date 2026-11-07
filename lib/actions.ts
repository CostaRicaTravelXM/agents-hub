import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdmin, isStaff } from "@/lib/auth";

/** Shared shape of every admin server action's answer. */
export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export async function staffClient() {
  const viewer = await getViewer();
  if (!viewer || !isStaff(viewer.profile)) throw new Error("Not allowed");
  return { supabase: await createClient(), viewer };
}

export async function adminClient() {
  const viewer = await getViewer();
  if (!viewer || !isAdmin(viewer.profile)) throw new Error("Only admins can do this");
  return { supabase: await createClient(), viewer };
}

export function fail(e: unknown): { ok: false; error: string } {
  const msg = e instanceof z.ZodError ? e.issues[0]?.message : e instanceof Error ? e.message : String(e);
  if (/duplicate key.*slug/i.test(msg ?? "")) return { ok: false, error: "That URL slug is already used by another item." };
  if (/duplicate key.*join_code/i.test(msg ?? "")) return { ok: false, error: "That invite code is already in use." };
  if (/row-level security/i.test(msg ?? "")) return { ok: false, error: "You do not have permission to do that." };
  return { ok: false, error: msg ?? "Something went wrong" };
}

export const uuid = z.string().uuid();

export const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));
