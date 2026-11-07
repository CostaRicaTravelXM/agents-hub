import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, Lock } from "lucide-react";
import { needsWelcome, requireViewer } from "@/lib/auth";
import { getCourseDetail } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { signedGetUrl } from "@/lib/storage";
import { mediaUrl } from "@/lib/media";
import { renderRichText } from "@/lib/rich-text";
import { LESSON_TYPE_LABEL, flattenLessons, lessonHref } from "@/lib/course";
import { PlayerTopBar } from "@/components/learning/player-chrome";
import { VideoPlayer } from "@/components/learning/video-player";
import { QuizRunner, type QuizData } from "@/components/learning/quiz-runner";
import { CompleteControl, DocumentLesson, EmbedVideoLesson, LinkLesson, PdfLesson } from "@/components/learning/lesson-bodies";
import { LockReason } from "@/components/learning/syllabus";
import { Button } from "@/components/ui/button";
import { cn, formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Lesson" };

const lessonStep = "flex min-h-[76px] min-w-0 items-center gap-3 rounded-lg border border-line p-3 transition-colors duration-120 ease-standard hover:border-ink";
const lessonStepIcon = "grid size-12 shrink-0 place-items-center rounded-pill bg-sunken text-ink";

export default async function LessonPage({ params }: PageProps<"/learn/[slug]/[lessonId]">) {
  const { slug, lessonId } = await params;
  const viewer = await requireViewer(`/learn/${slug}/${lessonId}`);
  if (needsWelcome(viewer.profile)) redirect(`/welcome?next=${encodeURIComponent(`/learn/${slug}/${lessonId}`)}`);

  const detail = await getCourseDetail(slug, viewer.id);
  if (!detail) notFound();
  const { course, modules, enrollment, certificate } = detail;

  const all = flattenLessons(modules);
  const idx = all.findIndex((l) => l.id === lessonId);
  if (idx < 0) notFound();
  const item = all[idx];
  const mod = modules[item.moduleIndex];
  const prev = all[idx - 1];
  const next = all[idx + 1];
  const nextHref = next && !next.locked ? lessonHref(slug, next.id) : null;
  const progress = enrollment?.progress_pct ?? 0;

  const chrome = (content: React.ReactNode) => (
    <div className="min-h-dvh">
      <PlayerTopBar
        courseSlug={slug}
        courseTitle={course.title}
        position={idx + 1}
        total={all.length}
        progress={progress}
        modules={modules}
        activeId={lessonId}
      />
      <main id="main" className="min-w-0 pb-16">
        {content}
      </main>
    </div>
  );

  /* ---------- Locked ---------- */
  if (item.locked) {
    return chrome(
      <div className="px-4 pt-10">
        <div className="mx-auto max-w-xl rounded-lg bg-sunken p-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-pill bg-white text-ink">
            <Lock aria-hidden className="size-6 stroke-[1.75]" />
          </span>
          <h1 className="xm-subtitle-sm mt-5">This lesson is locked</h1>
          <div className="mt-3 flex justify-center">
            <LockReason module={mod} />
          </div>
          <Button asChild className="mt-6">
            <Link href={`/courses/${slug}/modules/${mod.missing[0]?.id ?? mod.id}`}>Go to the required module</Link>
          </Button>
        </div>
      </div>,
    );
  }

  const supabase = await createClient();
  const [{ data: lesson }, started] = await Promise.all([
    supabase.from("lessons").select("*").eq("id", lessonId).single(),
    supabase.rpc("start_lesson", { p_lesson: lessonId }),
  ]);
  if (!lesson) notFound();
  const progressRow = started.data;
  const completed = item.status === "completed" || progressRow?.status === "completed";

  const header = (
    <header className={cn("mx-auto w-full max-w-[900px] px-4 md:px-8", lesson.type === "video" ? "mt-5" : "pt-6 md:pt-10")}>
      <h1 className="font-ui text-[26px] leading-[1.2] font-bold tracking-[-0.02em] text-ink md:text-[34px]">{lesson.title}</h1>
      <p className="mt-2 font-ui text-[15px] font-medium text-muted">
        {mod.title} · {LESSON_TYPE_LABEL[lesson.type]}
        {lesson.duration_seconds ? ` · ${formatDuration(lesson.duration_seconds)}` : ""}
      </p>
      {lesson.summary ? <p className="mt-3 max-w-2xl text-[17px] leading-[1.55] text-muted">{lesson.summary}</p> : null}
    </header>
  );

  let body: React.ReactNode = null;
  switch (lesson.type) {
    case "video": {
      const src = lesson.video_key ? await signedGetUrl(lesson.video_key) : null;
      body = src ? (
        <VideoPlayer
          key={lesson.id}
          src={src}
          poster={mediaUrl(lesson.poster_key)}
          title={lesson.title}
          refreshUrl={`/api/media/lesson/${lesson.id}?kind=video`}
          progress={{
            lessonId: lesson.id,
            startAt: progressRow?.last_position_seconds ?? 0,
            initialWatchPct: Number(progressRow?.watch_pct ?? item.watch_pct ?? 0),
            requiredPct: lesson.required_completion_pct,
            completed,
            nextHref,
          }}
        />
      ) : lesson.external_url ? (
        <EmbedVideoLesson lessonId={lesson.id} url={lesson.external_url} title={lesson.title} completed={completed} nextHref={nextHref} />
      ) : (
        <p className="mx-auto mt-6 max-w-[900px] rounded-lg bg-sunken p-6 text-muted">This video has not been uploaded yet.</p>
      );
      break;
    }
    case "pdf": {
      body = lesson.file_key ? (
        <PdfLesson
          lessonId={lesson.id}
          viewUrl={await signedGetUrl(lesson.file_key, { inline: true, downloadName: lesson.file_name ?? undefined })}
          fileName={lesson.file_name}
          fileSize={lesson.file_size}
          completed={completed}
          nextHref={nextHref}
        />
      ) : null;
      break;
    }
    case "document":
      body = (
        <DocumentLesson lessonId={lesson.id} fileName={lesson.file_name} fileSize={lesson.file_size} completed={completed} nextHref={nextHref} />
      );
      break;
    case "link":
      body = lesson.external_url ? (
        <LinkLesson lessonId={lesson.id} url={lesson.external_url} completed={completed} nextHref={nextHref} />
      ) : null;
      break;
    case "reading":
      body = (
        <div className="space-y-8">
          <article className="xm-prose max-w-[68ch] rounded-lg bg-card p-6 shadow-card md:p-10 md:text-[18px]" dangerouslySetInnerHTML={{ __html: renderRichText(lesson.body) }} />
          <CompleteControl lessonId={lesson.id} completed={completed} nextHref={nextHref} />
        </div>
      );
      break;
    case "quiz": {
      const { data: quiz } = await supabase.rpc("get_quiz", { p_lesson: lesson.id });
      body = quiz ? (
        <QuizRunner lessonId={lesson.id} quiz={quiz as unknown as QuizData} nextHref={nextHref} courseHref={`/courses/${slug}`} />
      ) : (
        <p className="rounded-lg bg-card p-6 text-muted shadow-card">This quiz has no questions yet.</p>
      );
      break;
    }
  }

  return chrome(
    <div className="xm-reveal">
      {enrollment?.completed_at && certificate ? (
        <Link
          href="/certificates"
          className="flex items-center gap-4 bg-inverse p-4 text-white transition-colors duration-120 hover:bg-stone md:p-5"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-toucan text-black">
            <Award aria-hidden className="size-5 stroke-[1.75]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-ui text-[15px] font-semibold text-white">You completed {course.title}</span>
            <span className="block text-[15px] text-white/85">Certificate {certificate.code} is ready to download.</span>
          </span>
          <ArrowRight aria-hidden className="size-5 stroke-[2]" />
        </Link>
      ) : null}

      {lesson.type === "video" ? (
        <>
          {body}
          {header}
        </>
      ) : (
        <>
          {header}
          <div className={cn("mx-auto mt-8 w-full px-4 md:px-8", lesson.type === "pdf" ? "max-w-[1200px]" : "max-w-[900px]")}>{body}</div>
        </>
      )}

      <nav aria-label="Lessons" className="mx-auto mt-10 grid w-full max-w-[900px] gap-3 px-4 sm:grid-cols-2 md:px-8">
        {prev ? (
          <Link href={lessonHref(slug, prev.id)} className={lessonStep}>
            <span className={lessonStepIcon}>
              <ArrowLeft aria-hidden className="size-5 stroke-[2]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] text-muted">Previous</span>
              <span className="block truncate font-ui text-[16px] font-semibold text-ink">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span className="hidden sm:block" />
        )}
        {next ? (
          nextHref ? (
            <Link href={nextHref} className={cn(lessonStep, "sm:flex-row-reverse sm:text-right")}>
              <span className={cn(lessonStepIcon, "bg-primary text-white")}>
                <ArrowRight aria-hidden className="size-5 stroke-[2]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] text-muted">Next</span>
                <span className="block truncate font-ui text-[16px] font-semibold text-ink">{next.title}</span>
              </span>
            </Link>
          ) : (
            <span className={cn(lessonStep, "cursor-not-allowed hover:border-line sm:flex-row-reverse sm:text-right")}>
              <span className={lessonStepIcon}>
                <Lock aria-hidden className="size-5 stroke-[2]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] text-muted">Next is locked</span>
                <span className="block truncate font-ui text-[16px] font-semibold text-muted">Finish this module first</span>
              </span>
            </span>
          )
        ) : (
          <Link href={`/courses/${slug}`} className={cn(lessonStep, "sm:flex-row-reverse sm:text-right")}>
            <span className={cn(lessonStepIcon, "bg-primary text-white")}>
              <ArrowRight aria-hidden className="size-5 stroke-[2]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] text-muted">Finished</span>
              <span className="block truncate font-ui text-[16px] font-semibold text-ink">Back to course</span>
            </span>
          </Link>
        )}
      </nav>
    </div>,
  );
}
