"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { toEmbedUrl } from "@/lib/hub/video-embed";
import { adminClient, fail, nullableText, staffClient, uuid, type Result } from "@/lib/actions";
import { deleteObject } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import type { Json } from "@/lib/database.types";

export type { Result } from "@/lib/actions";

/* ================================================================ courses */
const courseSchema = z.object({
  title: z.string().trim().min(3, "Give the course a title").max(140),
  slug: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v ?? ""),
  subtitle: nullableText(200),
  description: nullableText(4000),
  category_id: uuid.nullable().optional(),
  level: z.enum(["foundation", "advanced", "specialist"]),
  estimated_minutes: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  certificate_enabled: z.boolean().optional(),
  featured: z.boolean().optional(),
  cover_key: z.string().max(500).nullable().optional(),
});

export async function createCourse(input: z.input<typeof courseSchema>): Promise<Result> {
  let id: string;
  try {
    const { supabase, viewer } = await staffClient();
    const v = courseSchema.parse(input);
    const { data, error } = await supabase
      .from("courses")
      .insert({ ...v, slug: slugify(v.slug || v.title), created_by: viewer.id, status: "draft" })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  } catch (e) {
    return fail(e);
  }
  redirect(`/admin/courses/${id}`);
}

export async function updateCourse(id: string, input: z.input<typeof courseSchema>): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const v = courseSchema.parse(input);
    const { data: before } = await supabase.from("courses").select("cover_key").eq("id", id).single();
    const { error } = await supabase
      .from("courses")
      .update({ ...v, slug: slugify(v.slug || v.title) })
      .eq("id", uuid.parse(id));
    if (error) throw error;
    if (before?.cover_key && before.cover_key !== v.cover_key) await deleteObject("public", before.cover_key);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const accessSchema = z.object({
  status: z.enum(["draft", "published", "archived"]),
  visibility: z.enum(["public", "groups"]),
  groupIds: z.array(uuid),
});

export async function setCourseAccess(id: string, input: z.input<typeof accessSchema>): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const v = accessSchema.parse(input);
    if (v.visibility === "groups" && v.status === "published" && v.groupIds.length === 0) {
      return { ok: false, error: "Choose at least one group, or make the course public." };
    }
    const { error } = await supabase.from("courses").update({ status: v.status, visibility: v.visibility }).eq("id", id);
    if (error) throw error;
    await supabase.from("course_groups").delete().eq("course_id", id);
    if (v.groupIds.length) {
      const { error: e2 } = await supabase.from("course_groups").insert(v.groupIds.map((g) => ({ course_id: id, group_id: g })));
      if (e2) throw e2;
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCourse(id: string): Promise<Result> {
  try {
    const { supabase } = await adminClient();
    const { error } = await supabase.from("courses").delete().eq("id", uuid.parse(id));
    if (error) throw error;
  } catch (e) {
    return fail(e);
  }
  redirect("/admin/courses");
}

/* ================================================================ modules */
export async function createModule(courseId: string, title: string): Promise<Result<{ id: string }>> {
  try {
    const { supabase } = await staffClient();
    const t = z.string().trim().min(2, "Name the module").max(140).parse(title);
    const { data: last } = await supabase
      .from("modules")
      .select("sort_order")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("modules")
      .insert({ course_id: uuid.parse(courseId), title: t, sort_order: (last?.sort_order ?? -1) + 1 })
      .select("id")
      .single();
    if (error) throw error;
    refresh();
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateModule(
  id: string,
  input: { title: string; description?: string | null; requiredModuleIds: string[] },
): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const v = z
      .object({ title: z.string().trim().min(2).max(140), description: nullableText(1000), requiredModuleIds: z.array(uuid) })
      .parse(input);
    const { error } = await supabase.from("modules").update({ title: v.title, description: v.description }).eq("id", id);
    if (error) throw error;
    await supabase.from("module_requirements").delete().eq("module_id", id);
    if (v.requiredModuleIds.length) {
      const { error: e2 } = await supabase
        .from("module_requirements")
        .insert(v.requiredModuleIds.map((r) => ({ module_id: id, required_module_id: r })));
      if (e2) throw e2;
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteModule(id: string): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const { error } = await supabase.from("modules").delete().eq("id", uuid.parse(id));
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function reorder(
  table: "modules" | "lessons" | "resources" | "categories" | "hub_fam_trips" | "hub_offers" | "hub_books" | "hub_links",
  ids: string[],
): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const list = z.array(uuid).max(500).parse(ids);
    await Promise.all(list.map((id, i) => supabase.from(table).update({ sort_order: i }).eq("id", id)));
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ================================================================ lessons */
const lessonTypes = z.enum(["video", "pdf", "document", "link", "reading", "quiz"]);

export async function createLesson(moduleId: string, type: string, title: string): Promise<Result> {
  let id: string;
  try {
    const { supabase } = await staffClient();
    const t = lessonTypes.parse(type);
    const name = z.string().trim().min(2, "Name the lesson").max(160).parse(title);
    const { data: last } = await supabase
      .from("lessons")
      .select("sort_order")
      .eq("module_id", moduleId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        module_id: uuid.parse(moduleId),
        course_id: "00000000-0000-0000-0000-000000000000", // replaced by the lessons_course trigger
        title: name,
        type: t,
        sort_order: (last?.sort_order ?? -1) + 1,
        body: t === "reading" ? ({ type: "doc", content: [{ type: "paragraph" }] } as Json) : null,
      })
      .select("id")
      .single();
    if (error) throw error;
    if (t === "quiz") await supabase.from("quizzes").insert({ lesson_id: data.id });
    id = data.id;
  } catch (e) {
    return fail(e);
  }
  redirect(`/admin/lessons/${id}`);
}

const lessonSchema = z.object({
  title: z.string().trim().min(2).max(160),
  summary: nullableText(400),
  duration_seconds: z.coerce.number().int().min(0).max(24 * 3600).nullable().optional(),
  video_key: z.string().max(500).nullable().optional(),
  poster_key: z.string().max(500).nullable().optional(),
  file_key: z.string().max(500).nullable().optional(),
  file_name: z.string().max(260).nullable().optional(),
  file_size: z.number().int().nonnegative().nullable().optional(),
  file_mime: z.string().max(160).nullable().optional(),
  external_url: z
    .string()
    .trim()
    .url("Enter a full URL starting with https://")
    .refine((u) => /^https?:\/\//.test(u), "Only http and https links are allowed")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  body: z.any().optional(),
  required_completion_pct: z.coerce.number().int().min(1).max(100),
  is_required: z.boolean(),
});

export async function updateLesson(id: string, input: z.input<typeof lessonSchema>): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const v = lessonSchema.parse(input);
    const { data: before } = await supabase.from("lessons").select("type, video_key, poster_key, file_key").eq("id", id).single();
    // A video lesson can point to Google Drive or Wistia: keep the address that plays inside a page.
    const external_url = before?.type === "video" ? toEmbedUrl(v.external_url) : v.external_url;
    const { error } = await supabase
      .from("lessons")
      .update({ ...v, external_url, body: (v.body ?? null) as Json })
      .eq("id", uuid.parse(id));
    if (error) throw error;
    if (before) {
      if (before.video_key && before.video_key !== v.video_key) await deleteObject("private", before.video_key);
      if (before.file_key && before.file_key !== v.file_key) await deleteObject("private", before.file_key);
      if (before.poster_key && before.poster_key !== v.poster_key) await deleteObject("public", before.poster_key);
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLesson(id: string, courseId: string): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const { data: l } = await supabase.from("lessons").select("video_key, poster_key, file_key").eq("id", id).single();
    const { error } = await supabase.from("lessons").delete().eq("id", uuid.parse(id));
    if (error) throw error;
    await Promise.all([deleteObject("private", l?.video_key), deleteObject("private", l?.file_key), deleteObject("public", l?.poster_key)]);
  } catch (e) {
    return fail(e);
  }
  redirect(`/admin/courses/${courseId}?tab=structure`);
}

/* ================================================================ quizzes */
const quizSchema = z.object({
  passing_score: z.coerce.number().int().min(1).max(100),
  max_attempts: z.coerce.number().int().min(1).max(50).nullable(),
  shuffle_questions: z.boolean(),
  questions: z
    .array(
      z.object({
        id: uuid.optional(),
        prompt: z.string().trim().min(3, "Every question needs a prompt").max(500),
        type: z.enum(["single", "multiple", "true_false"]),
        options: z.array(z.object({ id: z.string().min(1).max(8), text: z.string().trim().min(1, "Options cannot be empty").max(300) })).min(2).max(8),
        correct: z.array(z.string()).min(1, "Mark at least one correct answer"),
        explanation: nullableText(800),
      }),
    )
    .max(100),
});

export async function saveQuiz(lessonId: string, input: z.input<typeof quizSchema>): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const v = quizSchema.parse(input);
    for (const [i, q] of v.questions.entries()) {
      if (q.type !== "multiple" && q.correct.length !== 1) return { ok: false, error: `Question ${i + 1} needs exactly one correct answer.` };
      if (!q.correct.every((c) => q.options.some((o) => o.id === c))) return { ok: false, error: `Question ${i + 1} has an invalid answer key.` };
    }
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .upsert(
        { lesson_id: uuid.parse(lessonId), passing_score: v.passing_score, max_attempts: v.max_attempts, shuffle_questions: v.shuffle_questions },
        { onConflict: "lesson_id" },
      )
      .select("id")
      .single();
    if (error) throw error;
    const keep = v.questions.map((q) => q.id).filter(Boolean) as string[];
    let del = supabase.from("quiz_questions").delete().eq("quiz_id", quiz.id);
    if (keep.length) del = del.not("id", "in", `(${keep.join(",")})`);
    await del;
    for (const [i, q] of v.questions.entries()) {
      const row = { quiz_id: quiz.id, prompt: q.prompt, type: q.type, options: q.options, correct: q.correct, explanation: q.explanation, sort_order: i };
      const res = q.id ? await supabase.from("quiz_questions").update(row).eq("id", q.id) : await supabase.from("quiz_questions").insert(row);
      if (res.error) throw res.error;
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ================================================================ resources */
const resourceSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: nullableText(300),
  file_key: z.string().max(500).nullable().optional(),
  file_name: z.string().max(260).nullable().optional(),
  file_size: z.number().int().nonnegative().nullable().optional(),
  file_mime: z.string().max(160).nullable().optional(),
  external_url: z.string().trim().url().nullable().optional(),
});

export async function addResource(courseId: string, input: z.input<typeof resourceSchema>): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const v = resourceSchema.parse(input);
    if (!v.file_key && !v.external_url) return { ok: false, error: "Upload a file or add a link." };
    const { data: last } = await supabase.from("resources").select("sort_order").eq("course_id", courseId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("resources").insert({ ...v, course_id: uuid.parse(courseId), sort_order: (last?.sort_order ?? -1) + 1 });
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteResource(id: string): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const { data } = await supabase.from("resources").select("file_key").eq("id", id).single();
    const { error } = await supabase.from("resources").delete().eq("id", uuid.parse(id));
    if (error) throw error;
    await deleteObject("private", data?.file_key);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ================================================================ categories */
const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: nullableText(300),
  is_destination: z.boolean(),
});

export async function saveCategory(id: string | null, input: z.input<typeof categorySchema>): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const v = categorySchema.parse(input);
    const res = id
      ? await supabase.from("categories").update({ ...v }).eq("id", id)
      : await supabase.from("categories").insert({ ...v, slug: slugify(v.name) });
    if (res.error) throw res.error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCategory(id: string): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const { error } = await supabase.from("categories").delete().eq("id", uuid.parse(id));
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ================================================================ groups */
const groupSchema = z.object({
  name: z.string().trim().min(2, "Name the group").max(120),
  description: nullableText(400),
  join_enabled: z.boolean(),
  join_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,24}$/, "Codes use 4 to 24 letters and numbers")
    .optional(),
});

export async function createGroup(input: z.input<typeof groupSchema>): Promise<Result> {
  let id: string;
  try {
    const { supabase, viewer } = await adminClient();
    const v = groupSchema.parse(input);
    const { data, error } = await supabase
      .from("groups")
      .insert({ name: v.name, description: v.description, join_enabled: v.join_enabled, created_by: viewer.id, ...(v.join_code ? { join_code: v.join_code } : {}) })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  } catch (e) {
    return fail(e);
  }
  redirect(`/admin/groups/${id}`);
}

export async function updateGroup(id: string, input: z.input<typeof groupSchema>): Promise<Result> {
  try {
    const { supabase } = await adminClient();
    const v = groupSchema.parse(input);
    const { error } = await supabase.from("groups").update(v).eq("id", uuid.parse(id));
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function regenerateJoinCode(id: string): Promise<Result<{ code: string }>> {
  try {
    const { supabase } = await adminClient();
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const code = Array.from(crypto.getRandomValues(new Uint32Array(8)), (n) => alphabet[n % alphabet.length]).join("");
    const { error } = await supabase.from("groups").update({ join_code: code }).eq("id", uuid.parse(id));
    if (error) throw error;
    refresh();
    return { ok: true, data: { code } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteGroup(id: string): Promise<Result> {
  try {
    const { supabase } = await adminClient();
    const { error } = await supabase.from("groups").delete().eq("id", uuid.parse(id));
    if (error) throw error;
  } catch (e) {
    return fail(e);
  }
  redirect("/admin/groups");
}

export async function addGroupMembers(groupId: string, emailsRaw: string): Promise<Result<{ added: number; missing: string[] }>> {
  try {
    const { supabase, viewer } = await adminClient();
    const emails = [...new Set(emailsRaw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
    if (!emails.length) return { ok: false, error: "Enter at least one email address." };
    if (emails.length > 500) return { ok: false, error: "Add up to 500 people at a time." };
    const { data: found, error } = await supabase.from("profiles").select("id, email").in("email", emails);
    if (error) throw error;
    const foundEmails = new Set((found ?? []).map((p) => p.email.toLowerCase()));
    if (found?.length) {
      const { error: e2 } = await supabase
        .from("group_members")
        .upsert(found.map((p) => ({ group_id: groupId, user_id: p.id, added_by: viewer.id, joined_via: "admin" })), {
          onConflict: "group_id,user_id",
          ignoreDuplicates: true,
        });
      if (e2) throw e2;
    }
    refresh();
    return { ok: true, data: { added: found?.length ?? 0, missing: emails.filter((e) => !foundEmails.has(e)) } };
  } catch (e) {
    return fail(e);
  }
}

export async function removeGroupMember(groupId: string, userId: string): Promise<Result> {
  try {
    const { supabase } = await adminClient();
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setGroupCourses(groupId: string, courseIds: string[]): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const ids = z.array(uuid).parse(courseIds);
    await supabase.from("course_groups").delete().eq("group_id", groupId);
    if (ids.length) {
      const { error } = await supabase.from("course_groups").insert(ids.map((c) => ({ group_id: groupId, course_id: c })));
      if (error) throw error;
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ================================================================ people */
export async function setUserRole(userId: string, role: string): Promise<Result> {
  try {
    const { supabase, viewer } = await adminClient();
    const r = z.enum(["agent", "content_manager", "admin"]).parse(role);
    if (userId === viewer.id && r !== "admin") return { ok: false, error: "You cannot remove your own admin access." };
    const { error } = await supabase.from("profiles").update({ role: r }).eq("id", uuid.parse(userId));
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
