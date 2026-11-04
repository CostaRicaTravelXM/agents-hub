"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Award, Check, ListChecks, RotateCcw, X } from "lucide-react";
import { submitQuiz, type QuizResult } from "@/app/actions/learning";
import { Button } from "@/components/ui/button";
import { Badge, ProgressBar, ProgressRing } from "@/components/ui/surface";
import { notify } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type QuizData = {
  quiz_id: string;
  passing_score: number;
  max_attempts: number | null;
  attempts_used: number;
  best_score: number | null;
  passed: boolean;
  questions: { id: string; prompt: string; type: "single" | "multiple" | "true_false"; options: { id: string; text: string }[] }[];
};

type Stage = "intro" | "question" | "result";

export function QuizRunner({ lessonId, quiz, nextHref, courseHref }: { lessonId: string; quiz: QuizData; nextHref?: string | null; courseHref: string }) {
  const [stage, setStage] = useState<Stage>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(quiz.attempts_used);
  const [pending, startTransition] = useTransition();

  const total = quiz.questions.length;
  const attemptsLeft = quiz.max_attempts === null ? null : Math.max(0, quiz.max_attempts - attemptsUsed);
  const canAttempt = attemptsLeft === null || attemptsLeft > 0;
  const q = quiz.questions[index];
  const chosen = q ? (answers[q.id] ?? []) : [];

  const choose = (optionId: string) => {
    if (!q) return;
    setAnswers((a) => {
      const current = a[q.id] ?? [];
      if (q.type === "multiple") {
        return { ...a, [q.id]: current.includes(optionId) ? current.filter((x) => x !== optionId) : [...current, optionId] };
      }
      return { ...a, [q.id]: [optionId] };
    });
  };

  const start = () => {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setStage("question");
  };

  const submit = () =>
    startTransition(async () => {
      const res = await submitQuiz(lessonId, answers);
      if (!res.ok) {
        notify.error("Your answers were not submitted", { description: res.error });
        return;
      }
      setResult(res.data!);
      setAttemptsUsed(res.data!.attempts_used);
      setStage("result");
      if (res.data!.passed) notify.success("Quiz passed", { description: `You scored ${Math.round(res.data!.score)}%.` });
    });

  /* ---------- Intro ---------- */
  if (stage === "intro") {
    return (
      <div className="rounded-lg bg-card p-6 shadow-card md:p-10">
        <span className="grid size-12 place-items-center rounded-pill bg-ink text-cloudy">
          <ListChecks aria-hidden className="size-5 stroke-[1.75]" />
        </span>
        <h2 className="xm-title-sm mt-5">{quiz.passed ? "You passed this quiz" : "Ready when you are"}</h2>
        <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-line py-5">
          <div>
            <dt className="xm-micro text-muted">Questions</dt>
            <dd className="mt-1 font-display text-[32px] leading-none text-ink">{total}</dd>
          </div>
          <div>
            <dt className="xm-micro text-muted">To pass</dt>
            <dd className="mt-1 font-display text-[32px] leading-none text-ink">{quiz.passing_score}%</dd>
          </div>
          <div>
            <dt className="xm-micro text-muted">{quiz.best_score !== null ? "Best score" : "Attempts"}</dt>
            <dd className="mt-1 font-display text-[32px] leading-none text-ink">
              {quiz.best_score !== null ? `${Math.round(quiz.best_score)}%` : quiz.max_attempts ?? "∞"}
            </dd>
          </div>
        </dl>
        <p className="mt-5 text-[15px] text-muted">
          {attemptsLeft === null
            ? "You can retake this quiz as many times as you need."
            : attemptsLeft === 0
              ? "You have used all your attempts. Contact TravelXM if you need another try."
              : `You have ${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} left.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {canAttempt ? (
            <Button size="lg" onClick={start} variant={quiz.passed ? "secondary" : "solid"}>
              {quiz.passed ? (
                <>
                  <RotateCcw aria-hidden /> Retake quiz
                </>
              ) : (
                <>
                  Start quiz <ArrowRight aria-hidden />
                </>
              )}
            </Button>
          ) : null}
          {quiz.passed && nextHref ? (
            <Button asChild size="lg">
              <Link href={nextHref}>
                Next lesson <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  /* ---------- Result ---------- */
  if (stage === "result" && result) {
    const byId = new Map(quiz.questions.map((qq) => [qq.id, qq]));
    return (
      <div className="space-y-5">
        <div className="rounded-lg bg-card p-6 shadow-card md:p-10">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <ProgressRing value={result.score} size={112} stroke={8} label="Quiz score">
              <span className="font-display text-[34px] leading-none text-ink">{Math.round(result.score)}%</span>
            </ProgressRing>
            <div>
              <Badge tone={result.passed ? "success" : "danger"}>{result.passed ? "Passed" : "Not passed yet"}</Badge>
              <h2 className="xm-title-sm mt-3">{result.passed ? "Well done" : `You need ${result.passing_score}% to pass`}</h2>
              <p className="mt-2 text-[15px] text-muted">
                {result.results.filter((r) => r.correct).length} of {result.results.length} correct.
                {!result.passed && result.max_attempts !== null
                  ? ` ${Math.max(0, result.max_attempts - result.attempts_used)} attempts left.`
                  : ""}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {result.passed ? (
              nextHref ? (
                <Button asChild size="lg">
                  <Link href={nextHref}>
                    Next lesson <ArrowRight aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg">
                  <Link href={courseHref}>
                    <Award aria-hidden /> Back to course
                  </Link>
                </Button>
              )
            ) : canAttempt ? (
              <Button size="lg" onClick={start}>
                <RotateCcw aria-hidden /> Try again
              </Button>
            ) : null}
          </div>
        </div>

        <ol className="space-y-3">
          {result.results.map((r, i) => {
            const qq = byId.get(r.question_id);
            if (!qq) return null;
            const text = (ids: string[] | undefined) => (ids ?? []).map((id) => qq.options.find((o) => o.id === id)?.text ?? id).join(", ");
            return (
              <li key={r.question_id} className="rounded-lg bg-card p-5 shadow-card">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-pill text-white",
                      r.correct ? "bg-olive" : "bg-danger",
                    )}
                    aria-label={r.correct ? "Correct" : "Incorrect"}
                  >
                    {r.correct ? <Check aria-hidden className="size-3.5 stroke-[3]" /> : <X aria-hidden className="size-3.5 stroke-[3]" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-ui text-[15px] font-semibold text-ink">
                      {i + 1}. {qq.prompt}
                    </p>
                    <p className="mt-1.5 text-[14px] text-body">
                      Your answer: <span className="font-semibold">{text(r.given) || "No answer"}</span>
                    </p>
                    {!r.correct && r.correct_options ? (
                      <p className="mt-1 text-[14px] text-body">
                        Correct answer: <span className="font-semibold text-olive">{text(r.correct_options)}</span>
                      </p>
                    ) : null}
                    {r.explanation && (r.correct || result.revealed) ? <p className="mt-2 text-[14px] text-muted italic">{r.explanation}</p> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  /* ---------- Questions ---------- */
  const isLast = index === total - 1;
  const answered = chosen.length > 0;
  return (
    <div className="rounded-lg bg-card p-6 shadow-card md:p-10">
      <div className="flex items-center justify-between gap-4">
        <p className="xm-micro text-muted">
          Question {index + 1} of {total}
        </p>
        <p className="xm-micro text-muted">{q.type === "multiple" ? "Select all that apply" : "Choose one"}</p>
      </div>
      <ProgressBar value={((index + (answered ? 1 : 0)) / total) * 100} className="mt-3" label="Quiz progress" />

      <fieldset key={q.id} className="xm-reveal mt-8">
        <legend className="font-ui text-[20px] leading-snug font-semibold text-ink md:text-[24px]">{q.prompt}</legend>
        <div className="mt-6 grid gap-3" role={q.type === "multiple" ? "group" : "radiogroup"}>
          {q.options.map((o, oi) => {
            const selected = chosen.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                role={q.type === "multiple" ? "checkbox" : "radio"}
                aria-checked={selected}
                onClick={() => choose(o.id)}
                className={cn(
                  "flex min-h-14 items-center gap-4 rounded-md border-2 px-4 py-3 text-left transition-[border-color,background-color] duration-120 ease-standard",
                  selected ? "border-primary bg-primary/10" : "border-line bg-card hover:border-[#cfc6b1] hover:bg-page",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center border-2 font-ui text-[13px] font-semibold transition-colors duration-120",
                    q.type === "multiple" ? "rounded-sm" : "rounded-pill",
                    selected ? "border-primary bg-primary text-white" : "border-line-strong/40 text-muted",
                  )}
                >
                  {selected ? <Check aria-hidden className="size-4 stroke-[3]" /> : String.fromCharCode(65 + oi)}
                </span>
                <span className="text-[16px] text-ink">{o.text}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        {isLast ? (
          <Button size="lg" onClick={submit} disabled={!answered} loading={pending}>
            Submit answers
          </Button>
        ) : (
          <Button size="lg" onClick={() => setIndex((i) => i + 1)} disabled={!answered}>
            Next <ArrowRight aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
