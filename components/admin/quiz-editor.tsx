"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { saveQuiz } from "@/app/actions/admin";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, NativeSelect, Switch, Textarea } from "@/components/ui/form";
import { notify } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type QType = "single" | "multiple" | "true_false";
type Option = { id: string; text: string };
export type EditorQuestion = { id?: string; prompt: string; type: QType; options: Option[]; correct: string[]; explanation: string | null };

const LETTERS = "abcdefgh";
const blank = (): EditorQuestion => ({
  prompt: "",
  type: "single",
  options: [
    { id: "a", text: "" },
    { id: "b", text: "" },
    { id: "c", text: "" },
  ],
  correct: [],
  explanation: "",
});

export function QuizEditor({
  lessonId,
  initial,
}: {
  lessonId: string;
  initial: { passing_score: number; max_attempts: number | null; shuffle_questions: boolean; questions: EditorQuestion[] };
}) {
  const [passing, setPassing] = useState(String(initial.passing_score));
  const [attempts, setAttempts] = useState(initial.max_attempts ? String(initial.max_attempts) : "");
  const [shuffle, setShuffle] = useState(initial.shuffle_questions);
  const [questions, setQuestions] = useState<EditorQuestion[]>(initial.questions.length ? initial.questions : [blank()]);
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<EditorQuestion>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) =>
    setQuestions((qs) => {
      const next = [...qs];
      const [q] = next.splice(i, 1);
      next.splice(i + d, 0, q);
      return next;
    });

  const setType = (i: number, type: QType) => {
    const q = questions[i];
    if (type === "true_false")
      return update(i, { type, options: [{ id: "a", text: "True" }, { id: "b", text: "False" }], correct: q.correct.filter((c) => c === "a" || c === "b").slice(0, 1) });
    update(i, { type, correct: type === "single" ? q.correct.slice(0, 1) : q.correct });
  };

  const toggleCorrect = (i: number, id: string) => {
    const q = questions[i];
    if (q.type === "multiple") update(i, { correct: q.correct.includes(id) ? q.correct.filter((c) => c !== id) : [...q.correct, id] });
    else update(i, { correct: [id] });
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveQuiz(lessonId, {
            passing_score: Number(passing),
            max_attempts: attempts ? Number(attempts) : null,
            shuffle_questions: shuffle,
            questions: questions.map((q) => ({ ...q, options: q.options.filter((o) => o.text.trim()) })),
          });
          if (!r.ok) return void notify.error("Quiz not saved", { description: r.error });
          notify.success("Quiz saved", { description: `${questions.length} questions` });
        });
      }}
    >
      <div className="grid gap-5 rounded-md border border-line p-4 sm:grid-cols-3">
        <Field label="Passing score (%)" htmlFor="q-pass">
          <Input id="q-pass" type="number" min={1} max={100} value={passing} onChange={(e) => setPassing(e.target.value)} />
        </Field>
        <Field label="Attempts allowed" htmlFor="q-att" hint="Leave empty for unlimited.">
          <Input id="q-att" type="number" min={1} max={50} value={attempts} onChange={(e) => setAttempts(e.target.value)} />
        </Field>
        <label className="flex items-center justify-between gap-3 self-center rounded-md bg-page px-4 py-3">
          <span className="font-ui text-[14px] font-semibold text-ink">Shuffle questions</span>
          <Switch checked={shuffle} onCheckedChange={setShuffle} aria-label="Shuffle questions" />
        </label>
      </div>

      <ol className="space-y-4">
        {questions.map((q, i) => (
          <li key={i} className="rounded-lg border border-line bg-card p-4 md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="font-display font-bold text-[22px] leading-none text-ink">Q{i + 1}</span>
              <span className="flex-1" />
              <NativeSelect aria-label={`Question ${i + 1} type`} value={q.type} onChange={(e) => setType(i, e.target.value as QType)} className="h-10 w-48">
                <option value="single">One correct answer</option>
                <option value="multiple">Several correct answers</option>
                <option value="true_false">True or false</option>
              </NativeSelect>
              <IconButton aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} type="button">
                <ArrowUp aria-hidden />
              </IconButton>
              <IconButton aria-label="Move down" disabled={i === questions.length - 1} onClick={() => move(i, 1)} type="button">
                <ArrowDown aria-hidden />
              </IconButton>
              <IconButton aria-label={`Delete question ${i + 1}`} type="button" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden />
              </IconButton>
            </div>
            <Field label="Question" htmlFor={`qp-${i}`}>
              <Textarea id={`qp-${i}`} rows={2} value={q.prompt} onChange={(e) => update(i, { prompt: e.target.value })} />
            </Field>
            <fieldset className="mt-4">
              <legend className="mb-2 font-ui text-[14px] font-semibold text-ink">
                Answers <span className="font-normal text-muted">· tick the correct {q.type === "multiple" ? "answers" : "answer"}</span>
              </legend>
              <div className="space-y-2">
                {q.options.map((o, oi) => {
                  const correct = q.correct.includes(o.id);
                  return (
                    <div key={o.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCorrect(i, o.id)}
                        aria-pressed={correct}
                        aria-label={`Mark answer ${oi + 1} as correct`}
                        className={cn(
                          "grid size-10 shrink-0 place-items-center border-2 transition-colors duration-120",
                          q.type === "multiple" ? "rounded-md" : "rounded-pill",
                          correct ? "border-olive bg-olive text-white" : "border-line text-muted hover:border-line-strong",
                        )}
                      >
                        {correct ? <Check aria-hidden className="size-4 stroke-[3]" /> : <span className="font-ui text-[13px] font-semibold uppercase">{o.id}</span>}
                      </button>
                      <Input
                        aria-label={`Answer ${oi + 1}`}
                        value={o.text}
                        disabled={q.type === "true_false"}
                        onChange={(e) => update(i, { options: q.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })}
                        className="h-10"
                      />
                      {q.type !== "true_false" && q.options.length > 2 ? (
                        <IconButton
                          type="button"
                          aria-label={`Remove answer ${oi + 1}`}
                          onClick={() => update(i, { options: q.options.filter((x) => x.id !== o.id), correct: q.correct.filter((c) => c !== o.id) })}
                        >
                          <Trash2 aria-hidden />
                        </IconButton>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {q.type !== "true_false" && q.options.length < 8 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const used = new Set(q.options.map((o) => o.id));
                    const id = [...LETTERS].find((l) => !used.has(l))!;
                    update(i, { options: [...q.options, { id, text: "" }] });
                  }}
                >
                  <Plus aria-hidden /> Add answer
                </Button>
              ) : null}
            </fieldset>
            <Field label="Explanation" htmlFor={`qe-${i}`} optional hint="Shown after submitting. Say why the right answer is right." className="mt-4">
              <Textarea id={`qe-${i}`} rows={2} value={q.explanation ?? ""} onChange={(e) => update(i, { explanation: e.target.value })} />
            </Field>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => setQuestions((qs) => [...qs, blank()])}>
          <Plus aria-hidden /> Add question
        </Button>
        <Button type="submit" loading={pending}>
          Save quiz
        </Button>
      </div>
    </form>
  );
}
