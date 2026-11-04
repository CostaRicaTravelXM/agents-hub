import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, BookOpen, PlayCircle } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getCatalog, getCourseDetail, getLearningTime, getMyCertificates } from "@/lib/queries";
import { LESSON_TYPE_LABEL, lessonHref, nextLesson } from "@/lib/course";
import { Page } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ProgressBar, SectionHeading } from "@/components/ui/surface";
import { Cover } from "@/components/learning/cover";
import { CourseCard } from "@/components/learning/course-card";
import { Stat } from "@/components/learning/stat";
import { firstName, formatCompactDuration, formatDate, formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const [catalog, certificates, time] = await Promise.all([
    getCatalog(viewer.id),
    getMyCertificates(viewer.id),
    getLearningTime(viewer.id),
  ]);

  const enrolled = catalog.filter((c) => c.enrollment);
  const inProgress = enrolled
    .filter((c) => !c.enrollment!.completed_at)
    .sort((a, b) => (b.enrollment!.last_activity_at ?? b.enrollment!.enrolled_at).localeCompare(a.enrollment!.last_activity_at ?? a.enrollment!.enrolled_at));
  const completed = enrolled.filter((c) => c.enrollment!.completed_at);
  const recommended = catalog
    .filter((c) => !c.enrollment)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.sort_order - b.sort_order)
    .slice(0, 3);
  const totalSeconds = time.reduce((s, t) => s + t.seconds, 0);

  const current = inProgress[0] ?? null;
  const currentDetail = current ? await getCourseDetail(current.slug, viewer.id) : null;
  const upNext = currentDetail ? nextLesson(currentDetail.modules, currentDetail.enrollment?.last_lesson_id) : null;
  const moduleIndex = upNext ? upNext.moduleIndex : 0;
  const featured = !current ? (catalog.find((c) => c.featured && !c.enrollment) ?? recommended[0] ?? null) : null;

  return (
    <Page>
      <header className="xm-reveal mb-8 md:mb-10">
        <h1 className="xm-title">Welcome back, {firstName(viewer.profile.full_name)}</h1>
        <p className="xm-lead mt-3 text-muted">
          {current
            ? "Pick up where you left off. Your place is saved on every device."
            : enrolled.length
              ? "You have finished every course you started. Choose your next one below."
              : "Start with one short lesson. Your progress saves automatically."}
        </p>
      </header>

      {/* Continue learning */}
      {current && currentDetail && upNext ? (
        <section aria-labelledby="continue-heading" className="xm-reveal">
          <div className="group relative isolate overflow-hidden rounded-lg bg-inverse shadow-raised">
            <div className="xm-veil xm-veil-tall relative h-[340px] md:h-[400px]">
              <Cover imageKey={current.cover_key} alt="" priority sizes="(min-width: 1024px) 900px, 100vw" tone="dark" zoomOnHover />
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 p-5 md:p-10">
              <h2 id="continue-heading" className="max-w-2xl font-display text-[40px] leading-none tracking-[0.005em] text-white uppercase md:text-[64px]">
                {current.title}
              </h2>
              <p className="xm-meta mt-3">
                Module {moduleIndex + 1} of {currentDetail.modules.length} · {Math.round(current.enrollment!.progress_pct)}% complete
              </p>
              <div className="mt-3 max-w-md">
                <ProgressBar value={current.enrollment!.progress_pct} tone="toucan" className="bg-white/25" label="Course progress" />
              </div>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button asChild size="lg">
                  <Link href={lessonHref(current.slug, upNext.id)}>
                    <PlayCircle aria-hidden /> Continue learning
                  </Link>
                </Button>
                <p className="text-[15px] text-cloudy">
                  Up next · <span className="font-semibold text-white">{upNext.title}</span>{" "}
                  <span className="text-cloudy/80">
                    ({LESSON_TYPE_LABEL[upNext.type]}
                    {upNext.duration_seconds ? `, ${formatDuration(upNext.duration_seconds)}` : ""})
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : featured ? (
        <section aria-labelledby="start-heading" className="xm-reveal">
          <div className="group relative isolate overflow-hidden rounded-lg bg-inverse shadow-raised">
            <div className="xm-veil xm-veil-tall relative h-[340px] md:h-[400px]">
              <Cover imageKey={featured.cover_key} alt="" priority sizes="(min-width: 1024px) 900px, 100vw" tone="dark" zoomOnHover />
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 p-5 md:p-10">
              <h2 id="start-heading" className="max-w-2xl font-display text-[40px] leading-none tracking-[0.005em] text-white uppercase md:text-[64px]">
                {featured.title}
              </h2>
              <p className="xm-meta mt-3">Start here · {featured.moduleCount} modules · Certificate included</p>
              {featured.subtitle ? <p className="mt-3 max-w-lg text-[17px] text-cloudy">{featured.subtitle}</p> : null}
              <Button asChild size="lg" className="mt-6">
                <Link href={`/courses/${featured.slug}`}>
                  View course <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Stats */}
      <section aria-label="Your numbers" className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:grid-cols-4 md:gap-5">
        <Stat label="In progress" value={inProgress.length} detail={inProgress.length === 1 ? "course" : "courses"} />
        <Stat label="Completed" value={completed.length} detail={completed.length === 1 ? "course" : "courses"} />
        <Stat label="Certificates" value={certificates.length} detail="earned" />
        <Stat label="Learning time" value={formatCompactDuration(totalSeconds)} detail="all time" />
      </section>

      {/* My courses */}
      <section aria-labelledby="mine-heading" className="mt-14 md:mt-20">
        <SectionHeading
          id="mine-heading"
         
          title="Your courses"
          action={
            <Link href="/progress" className="xm-link font-ui text-[14px] font-semibold">
              See progress
            </Link>
          }
        />
        {enrolled.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[...inProgress, ...completed].map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-6"
            icon={<BookOpen aria-hidden />}
            title="You have not started a course yet"
            body="Start with the Costa Rica Specialist. It takes about two hours and ends with a certificate."
            action={
              <Button asChild>
                <Link href="/courses">Browse courses</Link>
              </Button>
            }
          />
        )}
      </section>

      {/* Certificates */}
      {certificates.length ? (
        <section aria-labelledby="certs-heading" className="mt-14 md:mt-20">
          <SectionHeading
            id="certs-heading"
           
            title="Certificates"
            action={
              <Link href="/certificates" className="xm-link font-ui text-[14px] font-semibold">
                View all
              </Link>
            }
          />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {certificates.slice(0, 3).map((c) => (
              <li key={c.id}>
                <Link
                  href="/certificates"
                  className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-card transition-[transform,box-shadow] duration-200 ease-standard hover:-translate-y-[3px] hover:shadow-raised"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-pill bg-toucan text-black">
                    <Award aria-hidden className="size-5 stroke-[1.75]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-ui text-[15px] font-semibold text-ink">{c.course_title}</span>
                    <span className="block text-[13px] text-muted">Issued {formatDate(c.issued_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Recommended */}
      {recommended.length ? (
        <section aria-labelledby="rec-heading" className="mt-14 md:mt-20">
          <SectionHeading
            id="rec-heading"
           
            title="Next for you"
            action={
              <Link href="/courses" className="xm-link font-ui text-[14px] font-semibold">
                All courses
              </Link>
            }
          />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {recommended.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      ) : null}
    </Page>
  );
}
