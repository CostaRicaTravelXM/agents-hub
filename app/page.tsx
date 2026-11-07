/*
 * Landing page. It leads with what an advisor walks away with, the certificate,
 * and uses the same world as the app: pure white, photos first, one family of type,
 * tinted module icons and pill buttons.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ChevronDown, Clock, Mail, PlayCircle, Smartphone } from "lucide-react";
import { HOME_MODULES, MODULE_TINT } from "@/components/shell/nav-config";
import { getViewer } from "@/lib/auth";
import { getPublicCatalog, type PublicCourse } from "@/lib/queries";
import { LEVEL_LABEL } from "@/lib/course";
import { BrandLink, Cutout } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/surface";
import { CardAction } from "@/components/hub/media-card";
import { Cover } from "@/components/learning/cover";
import { CertificateArt } from "@/components/learning/certificate-art";
import { cn, formatDuration } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "TravelXM Agents Hub · For travel advisors who sell Costa Rica" },
  description:
    "Free Costa Rica training and certification, masterclasses, FAM trips, current offers, books and marketing assets for travel advisors, from TravelXM in San José.",
};

function courseTime(c: Pick<PublicCourse, "estimated_minutes" | "durationSeconds">) {
  return formatDuration(c.estimated_minutes ? c.estimated_minutes * 60 : c.durationSeconds);
}

export default async function HomePage() {
  const [viewer, catalog] = await Promise.all([getViewer(), getPublicCatalog()]);
  const specialist =
    catalog.find((c) => c.slug === "costa-rica-specialist") ?? catalog.find((c) => c.featured && c.certificate_enabled) ?? catalog[0] ?? null;
  const others = catalog.filter((c) => c.id !== specialist?.id);
  // Courses without a cover photo render as a blank slot; keep them off the
  // landing whenever enough courses have one.
  const withCover = others.filter((c) => c.cover_key);
  const destinations = (withCover.length >= 3 ? withCover : others).slice(0, 6);
  const certTitle = specialist?.title ?? "Costa Rica Specialist";
  const join = viewer ? "/dashboard" : "/register";
  const signIn = (next?: string) => (viewer ? (next ?? "/dashboard") : `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-card px-4 py-2 font-ui font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

            <header className="sticky top-0 z-40 bg-page pt-[env(safe-area-inset-top)]">
        <div className="xm-container flex h-[72px] items-center justify-between gap-3 md:h-20">
          <BrandLink />
          <nav aria-label="Account" className="flex items-center gap-2">
            {viewer ? (
              <Button asChild>
                <Link href="/dashboard">
                  Open the Hub <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="secondary">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild className="hidden sm:inline-flex">
                  <Link href="/register">Create free account</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main">
        {/* ---------- First viewport: the certificate ---------- */}
        <section
          aria-labelledby="hero-heading"
          className="xm-container grid items-center gap-8 pt-6 pb-16 md:pt-14 md:pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:grid-rows-[auto_auto] lg:gap-x-14 lg:gap-y-0"
        >
          {/* Phone order: promise, actions, certificate, then the details. On
              desktop the details sit under the actions in the left column. */}
          <div className="xm-reveal lg:self-end">
            <h1 id="hero-heading" className="xm-hero max-w-[12ch]">
              Become a Costa Rica Specialist
            </h1>
            <p className="xm-lead mt-5 max-w-xl md:mt-6">
              The Agents Hub is where TravelXM, the team in San José that runs your clients&apos; trips, gives advisors everything:
              free training with a certificate your clients can check, masterclasses, FAM trips, current offers and marketing material.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:mt-8">
              {viewer ? (
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    <PlayCircle aria-hidden /> Continue learning
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/register">
                      Create your free account <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/login">I already have an account</Link>
                  </Button>
                </>
              )}
            </div>
            {!viewer ? (
              <p className="mt-4 flex max-w-md items-start gap-2.5 text-[15px] text-muted md:mt-5">
                <Mail aria-hidden className="mt-0.5 size-5 shrink-0 stroke-[1.75]" />
                <span>Invited by TravelXM? Use the same email address the invitation was sent to.</span>
              </p>
            ) : null}
          </div>

          <div className="relative lg:row-span-2 lg:pl-6">
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-inverse lg:aspect-[4/5]">
              <div className="xm-veil absolute inset-0">
                <Image
                  src="/photos/fortuna-lago-arenal-volcan.jpg"
                  alt="Arenal volcano above Lake Arenal"
                  fill
                  priority
                  sizes="(min-width: 1024px) 480px, 100vw"
                  className="object-cover object-[78%_50%]"
                />
              </div>
              <p className="xm-meta absolute top-5 left-5 z-10 hidden lg:block">Arenal, La Fortuna</p>
            </div>
            <div className="xm-settle relative z-10 mx-4 -mt-16 sm:mx-12 sm:-mt-40 lg:absolute lg:bottom-12 lg:-left-10 lg:mx-0 lg:mt-0 lg:w-[400px]">
              <Card className="shadow-raised">
                <Badge tone="warning" className="absolute top-3 right-3 z-10">
                  Sample
                </Badge>
                <CertificateArt compact name="Your name here" courseTitle={certTitle} footer="Issued when you pass the final exam" />
              </Card>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-card p-4 shadow-card lg:absolute lg:top-14 lg:-right-6 lg:mt-0 lg:shadow-raised">
              <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-olive text-white">
                <BadgeCheck aria-hidden className="size-5 stroke-[1.75]" />
              </span>
              <span>
                <span className="block font-ui text-[15px] font-semibold text-ink">Clients can verify it</span>
                <span className="block text-[15px] text-muted">Every certificate has its own check code</span>
              </span>
            </div>
            <Cutout name="toucan" width={170} height={120} className="-top-14 right-2 z-20 hidden lg:block" />
          </div>

          <div className="lg:self-start">
            <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-5 font-ui text-[15px] font-semibold text-ink lg:mt-8">
              <li className="inline-flex items-center gap-2">
                <BadgeCheck aria-hidden className="size-5 shrink-0 stroke-[1.75] text-success" /> Free for advisors
              </li>
              <li className="inline-flex items-center gap-2">
                <Clock aria-hidden className="size-5 shrink-0 stroke-[1.75] text-success" />
                {specialist ? `About ${courseTime(specialist)}` : "Short lessons"}
              </li>
              <li className="inline-flex items-center gap-2">
                <Smartphone aria-hidden className="size-5 shrink-0 stroke-[1.75] text-success" /> Works on any device
              </li>
            </ul>
          </div>
        </section>

        {/* ---------- What is inside the Hub ---------- */}
        <section aria-labelledby="inside-heading" className="py-16 md:py-24">
          <div className="xm-container">
            <h2 id="inside-heading" className="xm-title-sm">
              One account, everything in one place
            </h2>
            <p className="xm-lead mt-4 max-w-2xl text-muted">
              Open the Hub on your phone, tablet or computer. Each section is one tap away, and your place is always saved.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {HOME_MODULES.filter((m) => !m.external).map((m) => {
                const Icon = m.icon;
                return (
                  <li key={m.id} className="flex items-start gap-4 rounded-lg bg-card p-5 shadow-card">
                    <span className={cn("grid size-12 shrink-0 place-items-center rounded-md text-ink", MODULE_TINT[m.id])}>
                      <Icon aria-hidden className="size-6 stroke-[1.75]" />
                    </span>
                    <span>
                      <span className="block font-ui text-[19px] leading-tight font-semibold text-ink">{m.label}</span>
                      <span className="mt-1.5 block text-[16px] leading-snug text-muted">{m.description}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---------- What you learn to earn it ---------- */}
        {specialist?.modules.length ? (
          <section aria-labelledby="syllabus-heading" className="bg-sunken py-16 md:py-24">
            <div className="xm-container grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <h2 id="syllabus-heading" className="xm-title-sm">
                  What you learn to earn it
                </h2>
                <p className="xm-lead mt-4 max-w-md text-muted">
                  The {specialist.title} course, module by module. Watch, read, then pass the final exam. Your place is saved, so you
                  can stop between client calls and carry on later.
                </p>
                <p className="mt-6 font-ui text-[15px] font-semibold text-ink">
                  {specialist.lessonCount} lessons, {courseTime(specialist)}
                  {specialist.level ? `, ${LEVEL_LABEL[specialist.level]}` : ""}
                </p>
                <Button asChild size="lg" className="mt-6">
                  <Link href={viewer ? `/courses/${specialist.slug}` : "/register"}>
                    {viewer ? "Open the course" : "Start the course free"} <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>

              <ol className="space-y-3">
                {specialist.modules.map((m, i) => (
                  <li key={m.id} className="flex items-start gap-4 rounded-lg bg-card p-5 shadow-card md:p-6">
                    <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-ink font-display text-[18px] font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-ui text-[19px] leading-snug font-semibold text-ink">{m.title}</h3>
                      {m.description ? <p className="mt-1.5 text-[15px] text-muted">{m.description}</p> : null}
                      <p className="mt-2 font-ui text-[15px] font-medium text-body">
                        {m.lessonCount} {m.lessonCount === 1 ? "lesson" : "lessons"}
                        {m.durationSeconds ? `, ${formatDuration(m.durationSeconds)}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
                <li className="flex items-center gap-4 rounded-lg bg-inverse p-5 text-white md:p-6">
                  <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-toucan text-black">
                    <BadgeCheck aria-hidden className="size-5 stroke-[1.75]" />
                  </span>
                  <p className="font-ui text-[17px] font-semibold">Pass the exam and your certificate is ready to download.</p>
                </li>
              </ol>
            </div>
          </section>
        ) : null}

        {/* ---------- Destination courses ---------- */}
        {destinations.length ? (
          <section aria-labelledby="courses-heading" className="xm-container py-16 md:py-24">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <h2 id="courses-heading" className="xm-title-sm">
                  Then go deeper, one destination at a time
                </h2>
                <p className="xm-lead mt-4 text-muted">The places your clients ask about, taught by the people who book them every day.</p>
              </div>
            </div>
            <ul className="mt-10 grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-6">
              {destinations.map((c, i) => (
                <li key={c.id} className={lastRowSpan(i, destinations.length)}>
                  <PublicCourseCard course={c} href={viewer ? `/courses/${c.slug}` : signIn(`/courses/${c.slug}`)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ---------- Plain answers ---------- */}
        <section aria-labelledby="faq-heading" className="pb-16 md:pb-24">
          <div className="xm-container grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16">
            <div>
              <h2 id="faq-heading" className="xm-title-sm">
                Questions advisors ask
              </h2>
              <p className="xm-lead mt-4 max-w-md text-muted">No tech skills needed. If you can read an email, you can use the Hub.</p>
            </div>
            <div className="divide-y divide-line overflow-hidden rounded-lg bg-card shadow-card">
              {faqs(specialist).map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-ui text-[17px] font-semibold text-ink transition-colors duration-120 ease-standard hover:bg-sunken/50 md:px-6 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown
                      aria-hidden
                      className="size-5 shrink-0 stroke-[2] text-muted transition-transform duration-200 ease-standard group-open:rotate-180"
                    />
                  </summary>
                  <p className="px-5 pb-5 text-[16px] leading-[1.6] text-body md:px-6">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Close ---------- */}
        <section aria-labelledby="close-heading" className="relative overflow-hidden bg-inverse">
          <div className="xm-container flex flex-col items-start gap-8 py-16 md:flex-row md:items-center md:justify-between md:py-20">
            <div className="max-w-2xl">
              <h2 id="close-heading" className="xm-display text-white">
                Your next Costa Rica sale starts with one lesson
              </h2>
              <p className="mt-4 text-[17px] text-white">Pura Vida from the TravelXM team in San José.</p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto xl:mr-44">
              <Button asChild size="lg">
                <Link href={join}>
                  {viewer ? "Open the Hub" : "Create your free account"} <ArrowRight aria-hidden />
                </Link>
              </Button>
              {!viewer ? (
                <Button asChild size="lg" variant="inverse">
                  <Link href="/login">Sign in</Link>
                </Button>
              ) : null}
            </div>
          </div>
          <Cutout name="sloth" width={180} height={134} className="right-8 -bottom-4 hidden xl:block" />
        </section>
      </main>

      <footer className="xm-container flex flex-col gap-3 py-10 text-[15px] text-muted md:flex-row md:justify-between">
        <p>© {new Date().getFullYear()} TravelXM, San José, Costa Rica</p>
        <p>Photography: Wikimedia Commons contributors</p>
      </footer>
    </div>
  );
}

/** Six-column grid at xl: rows of three, and the last row stretches to fill. */
function lastRowSpan(index: number, count: number) {
  const rest = count % 3 || 3;
  if (index < count - rest) return "xl:col-span-2";
  return rest === 1 ? "xl:col-span-6" : rest === 2 ? "xl:col-span-3" : "xl:col-span-2";
}

function PublicCourseCard({ course, href }: { course: PublicCourse; href: string }) {
  return (
    <Link href={href} className="group flex h-full flex-col rounded-lg">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-sunken">
        <Cover imageKey={course.cover_key} alt="" zoomOnHover sizes="(min-width: 1280px) 380px, (min-width: 640px) 45vw, 100vw" />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-white text-ink">{course.category ?? LEVEL_LABEL[course.level]}</Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-1 pt-4">
        <h3 className="font-ui text-[20px] leading-[1.25] font-semibold tracking-[-0.01em] text-ink">{course.title}</h3>
        {course.subtitle ? <p className="mt-1.5 line-clamp-2 text-[16px] text-body">{course.subtitle}</p> : null}
        <p className="mt-2 text-[15px] text-muted">
          {course.modules.length} {course.modules.length === 1 ? "module" : "modules"}, {courseTime(course)}
        </p>
        <CardAction label="Free with your account" />
      </div>
    </Link>
  );
}

function faqs(specialist: PublicCourse | null) {
  return [
    { q: "Does it cost anything?", a: "No. The Agents Hub and its courses are free for travel advisors who sell Costa Rica." },
    {
      q: "I am an independent agent, not part of an agency. Can I join?",
      a: "Yes. When you create your account, tick “I am a solo or independent agent” and leave the agency empty.",
    },
    {
      q: "Do I need to install anything?",
      a: "No. It opens in your web browser on a phone, tablet or computer. On a phone you can add it to your home screen so it opens like an app.",
    },
    {
      q: "How long does it take?",
      a: specialist
        ? `The ${specialist.title} takes about ${courseTime(specialist)} in total, in short lessons. Your place is saved on every device, so you can stop and carry on whenever you like.`
        : "Lessons are short and your place is saved on every device, so you can stop and carry on whenever you like.",
    },
    {
      q: "How do my clients check my certificate?",
      a: "Every certificate has its own code. Share the link from your Certificates page, or give clients the code, and they will see it is genuine.",
    },
    {
      q: "TravelXM sent me an invitation. What do I do?",
      a: "Open the link in the invitation and create your account, or sign in if you already have one. The courses for your group appear automatically.",
    },
    {
      q: "I forgot my password.",
      a: "On the sign-in page, choose “Forgot your password?”. We email you a link, and you choose a new password from there.",
    },
  ];
}
