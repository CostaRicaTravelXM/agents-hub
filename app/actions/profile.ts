"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { safeNext } from "@/lib/utils";
import type { FormState } from "@/app/actions/auth";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  company: z.string().trim().min(2, "Enter your agency or company").max(160),
  job_title: z.string().trim().max(120).optional().transform((v) => v || null),
  country: z.string().trim().min(2, "Choose your country"),
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[+()\d\s.-]*$/, "Use digits, spaces and + only")
    .optional()
    .transform((v) => v || null),
  next: z.string().optional(),
});

function toErrors(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: toErrors(parsed.error) };
  const { next, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...values, onboarded_at: viewer.profile.onboarded_at ?? new Date().toISOString() })
    .eq("id", viewer.id);
  if (error) return { error: error.message };
  if (next !== undefined) redirect(safeNext(next));
  refresh();
  return { message: "Profile saved." };
}
