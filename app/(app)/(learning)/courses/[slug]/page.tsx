import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BookOpenText, FileText, ListChecks, PlayCircle, RotateCcw, Users } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getCourseDetail } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { flattenLessons, lessonHref, nextLesson } from "@/lib/course";
import { CourseHero } from "@/components/learning/course-hero";
import { Syllabus } from "@/components/learning/syllabus";
import { ResourceList } from "@/components/learning/resource-list";
import { Button } from "@/components/ui/button";
import { StickyCta } from "@/components/hub/sticky-cta";
import { Badge, ProgressRing } from "@/components/ui/surface";
import { formatDate, formatDuration } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const viewer = await requireViewer();
  const detail = await getCourseDetail(slug, viewer.id);
  return { title: detail?.course.title ?? "Course" };
}

export default async function CoursePage({ params }: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const viewer = await requireViewer();
  const detail = await getCourseDetail(slug, viewer.id);
  if (!detail) notFound();
  const { course, modules, enrollment, resources, certificate, category } = detail;

  const supabase = await createClient();
  await supabase.rpc("log_event", { p_event: "course_view", p_course: course.id });

  const lessons = flattenLessons(modules);
  const required = lessons.filter((l) => l.is_required);
  const doneCount = required.filter((l) => l.status === "completed").length;
  const pct = enrollment?.progress_pct ?? 0;
  const next = nextLesson(modules, enrollment?.last_lesson_id);
  const totalSeconds = course.estimated_minutes ? course.estimated_minutes * 60 : lessons.reduce((s, l) => s + (l.duration_seconds ?? 0), 0);
  const counts = {
    video: lessons.filter((l) => l.type === "video").length,
    reading: lessons.filter((l) => l.type === "reading" || l.type === "link").length,
    docs: lessons.filter((l) => l.type === "pdf" || l.type === "document").length,
    quiz: lessons.filter((l) => l.type === "quiz").length,
  };
  const completed = Boolean(enrollment?.completed_at);
  const cta = !enrollment
    ? { label: "Start course", icon: PlayCircle }
    : completed
      ? { label: "Review course", icon: RotateCcw }
      : { label: "Continue learning", icon: PlayCircle };

  return (
    <div>
      <CourseHero
        courseId={course.id}
        coverKey={course.cover_key}
        meta={`Masterclass · ${formatDuration(totalSeconds)}`}
        title={course.title}
        subtitle={course.subtitle}
        back={{ href: "/courses", label: "Masterclasses" }}
      />

      <div className="xm-container mt-8 grid gap-8 md:mt-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="xm-title-sm">
              About this masterclass
            </h2>
            <p className="xm-body mt-4 max-w-2xl">{course.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {category ? <Badge tone="neutral">{category.name}</Badge> : null}
              {course.visibility === "groups" ? (
                <Badge tone="warning">
                  <Users aria-hidden /> Partner content
                </Badge>
              ) : null}
              {course.certificate_enabled ? (
                <Badge tone="neutral">
                  <Award aria-hidden /> Certificate
                </Badge>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="syllabus-heading">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <h2 id="syllabus-heading" className="xm-title-sm">
                What is in this course
              </h2>
              <p className="text-[15px] text-muted">
                {lessons.length} lessons · {formatDuration(totalSeconds)}
              </p>
            </div>
            <Syllabus courseSlug={course.slug} modules={modules} />
          </section>
        </div>

        {/* Sticky progress card */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-lg bg-card p-6 shadow-raised">
            <div className="flex items-center gap-4">
              <ProgressRing value={pct} size={72} stroke={6} label="Course progress" />
              <div>
                <p className="font-ui text-[17px] font-semibold text-ink">
                  {completed ? "Course complete" : enrollment ? `${doneCount} of ${required.length} lessons done` : "Not started yet"}
                </p>
                <p className="mt-0.5 text-[15px] text-muted">
                  {completed
                    ? `Finished ${formatDate(enrollment!.completed_at)}`
                    : enrollment
                      ? `Up next: ${next?.title ?? ""}`
                      : `${required.length} required lessons`}
                </p>
              </div>
            </div>

            {next ? (
              <Button asChild block size="lg" className="mt-6 hidden lg:inline-flex">
                <Link href={lessonHref(course.slug, next.id)}>
                  <cta.icon aria-hidden /> {cta.label}
                </Link>
              </Button>
            ) : null}

            {certificate ? (
              <Link
                href="/certificates"
                className="mt-4 flex items-center gap-3 rounded-md bg-sunken p-3 transition-colors duration-120 hover:bg-line"
              >
                <span className="grid size-9 place-items-center rounded-pill bg-toucan text-black">
                  <Award aria-hidden className="size-4 stroke-[2]" />
                </span>
                <span className="text-[15px]">
                  <span className="block font-ui font-semibold text-ink">Certificate earned</span>
                  <span className="text-muted">{certificate.code}</span>
                </span>
              </Link>
            ) : null}

            <div className="mt-6 border-t border-line pt-5">
              <p className="xm-micro text-muted">This course includes</p>
              <ul className="mt-3 space-y-2.5 text-[15px] text-body">
                {counts.video ? (
                  <li className="flex items-center gap-2.5">
                    <PlayCircle aria-hidden className="size-5 stroke-[1.75] text-muted" /> {counts.video} video lessons
                  </li>
                ) : null}
                {counts.reading ? (
                  <li className="flex items-center gap-2.5">
                    <BookOpenText aria-hidden className="size-5 stroke-[1.75] text-muted" /> {counts.reading} readings and links
                  </li>
                ) : null}
                {counts.docs ? (
                  <li className="flex items-center gap-2.5">
                    <FileText aria-hidden className="size-5 stroke-[1.75] text-muted" /> {counts.docs} downloadable documents
                  </li>
                ) : null}
                {counts.quiz ? (
                  <li className="flex items-center gap-2.5">
                    <ListChecks aria-hidden className="size-5 stroke-[1.75] text-muted" /> {counts.quiz === 1 ? "A quiz" : `${counts.quiz} quizzes`}
                  </li>
                ) : null}
                {course.certificate_enabled ? (
                  <li className="flex items-center gap-2.5">
                    <Award aria-hidden className="size-5 stroke-[1.75] text-muted" /> Certificate on completion
                  </li>
                ) : null}
              </ul>
            </div>

            {resources.length ? (
              <div className="mt-6 border-t border-line pt-5">
                <p className="xm-micro text-muted">Resources</p>
                <div className="mt-1">
                  <ResourceList resources={resources} />
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
      {next ? (
        <StickyCta>
          <Button asChild block size="lg">
            <Link href={lessonHref(course.slug, next.id)}>
              <cta.icon aria-hidden /> {cta.label}
            </Link>
          </Button>
        </StickyCta>
      ) : null}
    </div>
  );
}
