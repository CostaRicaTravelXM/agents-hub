import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LESSON_TYPE_LABEL } from "@/lib/course";
import { AdminHeader } from "@/components/admin/ui";
import { LessonEditor } from "@/components/admin/lesson-editor";
import { QuizEditor, type EditorQuestion } from "@/components/admin/quiz-editor";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit lesson" };

export default async function LessonEditPage({ params }: PageProps<"/admin/lessons/[id]">) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("*, module:modules(id, title), course:courses(id, title, slug)")
    .eq("id", id)
    .maybeSingle();
  if (!lesson || !lesson.course || !lesson.module) notFound();

  let quiz: { passing_score: number; max_attempts: number | null; shuffle_questions: boolean; questions: EditorQuestion[] } | null = null;
  if (lesson.type === "quiz") {
    const { data } = await supabase
      .from("quizzes")
      .select("passing_score, max_attempts, shuffle_questions, quiz_questions(id, prompt, type, options, correct, explanation, sort_order)")
      .eq("lesson_id", lesson.id)
      .maybeSingle();
    quiz = {
      passing_score: data?.passing_score ?? 80,
      max_attempts: data?.max_attempts ?? null,
      shuffle_questions: data?.shuffle_questions ?? false,
      questions: [...(data?.quiz_questions ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((q) => ({
          id: q.id,
          prompt: q.prompt,
          type: q.type,
          options: q.options as { id: string; text: string }[],
          correct: q.correct as string[],
          explanation: q.explanation,
        })),
    };
  }

  const { course, module: mod, ...rest } = lesson;
  return (
    <>
      <AdminHeader
        back={{ href: `/admin/courses/${course.id}?tab=structure`, label: `${course.title} · ${mod.title}` }}
        description={`${LESSON_TYPE_LABEL[lesson.type]} lesson`}
        title={lesson.title}
        actions={
          <Button asChild variant="secondary">
            <Link href={`/learn/${course.slug}/${lesson.id}`} target="_blank">
              <Eye aria-hidden /> Preview
            </Link>
          </Button>
        }
      />
      <LessonEditor lesson={rest} courseId={course.id} />
      {quiz ? (
        <section className="mt-6 rounded-lg bg-card p-5 shadow-card md:p-6">
          <h2 className="mb-5 font-ui text-[18px] font-semibold text-ink">Questions</h2>
          <QuizEditor lessonId={lesson.id} initial={quiz} />
        </section>
      ) : null}
    </>
  );
}
