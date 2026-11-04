"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const id = z.string().uuid();

export async function completeLesson(lessonId: string): Promise<Result<{ courseCompleted: boolean }>> {
  if (!id.safeParse(lessonId).success) return { ok: false, error: "Invalid lesson" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_lesson", { p_lesson: lessonId });
  if (error) return { ok: false, error: error.message };
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("completed_at")
    .eq("course_id", data.course_id)
    .eq("user_id", data.user_id)
    .maybeSingle();
  refresh();
  return { ok: true, data: { courseCompleted: Boolean(enrollment?.completed_at) } };
}

export type QuizResult = {
  score: number;
  passed: boolean;
  passing_score: number;
  attempts_used: number;
  max_attempts: number | null;
  revealed: boolean;
  results: { question_id: string; correct: boolean; given: string[]; correct_options?: string[]; explanation: string | null }[];
};

const answersSchema = z.record(z.string().uuid(), z.array(z.string().max(8)).max(12));

export async function submitQuiz(lessonId: string, answers: Record<string, string[]>): Promise<Result<QuizResult>> {
  if (!id.safeParse(lessonId).success) return { ok: false, error: "Invalid lesson" };
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false, error: "Invalid answers" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quiz", { p_lesson: lessonId, p_answers: parsed.data });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: data as unknown as QuizResult };
}

export async function joinGroup(code: string): Promise<Result<{ name: string; alreadyMember: boolean }>> {
  const clean = z.string().trim().min(4).max(32).safeParse(code);
  if (!clean.success) return { ok: false, error: "Enter the invite code you received" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group", { p_code: clean.data });
  if (error) return { ok: false, error: error.message };
  const row = data?.[0];
  refresh();
  return { ok: true, data: { name: row?.group_name ?? "the group", alreadyMember: Boolean(row?.already_member) } };
}
