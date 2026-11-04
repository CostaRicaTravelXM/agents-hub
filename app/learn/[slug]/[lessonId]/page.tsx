import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, Lock } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getCourseDetail } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { signedGetUrl } from "@/lib/storage";
import { mediaUrl } from "@/lib/media";
import { renderRichText } from "@/lib/rich-text";
import { LESSON_TYPE_LABEL, flattenLessons, lessonHref } from "@/lib/course";
import { PlayerSyllabus, PlayerTopBar } from "@/components/learning/player-chrome";
import { VideoPlayer } from "@/components/learning/video-player";
import { QuizRunner, type QuizData } from "@/components/learning/quiz-runner";
import { CompleteControl, DocumentLesson, LinkLesson, PdfLesson } from "@/components/learning/lesson-bodies";
import { LockReason } from "@/components/learning/syllabus";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Lesson" };

export default async function LessonPage({ params }: PageProps<"/learn/[slug]/[lessonId]">) {
  const { slug, lessonId } = await params;
  const viewer = await requireViewer(`/learn/${slug}/${lessonId}`);
  if (!viewer.profile.first_name || !viewer.profile.last_name) redirect("/welcome");

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
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <main id="main" className="min-w-0 pb-16 md:px-8 md:pt-8 lg:px-10">
          {content}
        </main>
        <aside className="sticky top-16 hidden h-[calc(100dvh-64px)] overflow-y-auto border-l border-line px-3 py-6 lg:block">
          <PlayerSyllabus courseSlug={slug} modules={modules} activeId={lessonId} />
        </aside>
      </div>
    </div>
  );

  /* ---------- Locked ---------- */
  if (item.locked) {
    return chrome(
      <div className="px-4 pt-10 md:px-0">
        <div className="mx-auto max-w-xl rounded-lg bg-card p-8 text-center shadow-card">
          <span className="mx-auto grid size-14 place-items-center rounded-pill bg-sunken text-body">
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
    <header className={lesson.type === "video" ? "mt-6 px-4 md:px-0" : "px-4 pt-6 md:px-0 md:pt-0"}>
      <h1 className="font-ui text-[26px] leading-[1.2] font-semibold text-ink md:text-[34px]">{lesson.title}</h1>
      <p className="mt-2 font-ui text-[14px] font-semibold text-muted">
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
          lessonId={lesson.id}
          src={src}
          poster={mediaUrl(lesson.poster_key)}
          title={lesson.title}
          startAt={progressRow?.last_position_seconds ?? 0}
          initialWatchPct={Number(progressRow?.watch_pct ?? item.watch_pct ?? 0)}
          requiredPct={lesson.required_completion_pct}
          completed={completed}
          nextHref={nextHref}
        />
      ) : (
        <p className="rounded-lg bg-card p-6 text-muted shadow-card">This video has not been uploaded yet.</p>
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
          className="mb-6 flex items-center gap-4 bg-inverse p-4 text-cloudy transition-colors duration-120 hover:bg-stone md:rounded-lg md:p-5"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-toucan text-black">
            <Award aria-hidden className="size-5 stroke-[1.75]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-ui text-[15px] font-semibold text-white">You completed {course.title}</span>
            <span className="block text-[13px] text-cloudy/80">Certificate {certificate.code} is ready to download.</span>
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
          <div className="mt-8 px-4 md:px-0">{body}</div>
        </>
      )}

      <nav aria-label="Lessons" className="mt-12 grid grid-cols-2 gap-3 border-t border-line px-4 pt-6 md:px-0">
        {prev ? (
          <Link href={lessonHref(slug, prev.id)} className="group flex min-w-0 items-center gap-3 rounded-md p-2 transition-colors duration-120 hover:bg-sunken">
            <ArrowLeft aria-hidden className="size-5 shrink-0 stroke-[2] text-muted" />
            <span className="min-w-0">
              <span className="xm-micro block text-muted">Previous</span>
              <span className="block truncate font-ui text-[14px] font-semibold text-ink">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          nextHref ? (
            <Link href={nextHref} className="group flex min-w-0 items-center justify-end gap-3 rounded-md p-2 text-right transition-colors duration-120 hover:bg-sunken">
              <span className="min-w-0">
                <span className="xm-micro block text-muted">Next</span>
                <span className="block truncate font-ui text-[14px] font-semibold text-ink">{next.title}</span>
              </span>
              <ArrowRight aria-hidden className="size-5 shrink-0 stroke-[2] text-muted" />
            </Link>
          ) : (
            <span className="flex min-w-0 items-center justify-end gap-3 p-2 text-right opacity-70">
              <span className="min-w-0">
                <span className="xm-micro block text-muted">Next · locked</span>
                <span className="block truncate font-ui text-[14px] font-semibold text-muted">Finish this module first</span>
              </span>
              <Lock aria-hidden className="size-5 shrink-0 stroke-[2] text-muted" />
            </span>
          )
        ) : (
          <Link href={`/courses/${slug}`} className="flex items-center justify-end gap-3 rounded-md p-2 text-right hover:bg-sunken">
            <span>
              <span className="xm-micro block text-muted">Finished</span>
              <span className="block font-ui text-[14px] font-semibold text-ink">Back to course</span>
            </span>
            <ArrowRight aria-hidden className="size-5 stroke-[2] text-muted" />
          </Link>
        )}
      </nav>
    </div>,
  );
}
