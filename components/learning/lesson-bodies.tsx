"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Download, ExternalLink, FileDown, FileText } from "lucide-react";
import { completeLesson } from "@/app/actions/learning";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/toast";
import { formatBytes } from "@/lib/utils";

export function CompleteControl({
  lessonId,
  completed: initial,
  nextHref,
  label = "Mark as complete",
  hint,
}: {
  lessonId: string;
  completed: boolean;
  nextHref?: string | null;
  label?: string;
  hint?: string;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initial);
  const [pending, start] = useTransition();

  const complete = () =>
    start(async () => {
      setCompleted(true); // optimistic
      const res = await completeLesson(lessonId);
      if (!res.ok) {
        setCompleted(false);
        notify.error("Could not save your progress", { description: res.error });
        return;
      }
      notify.success(res.data?.courseCompleted ? "Course complete" : "Lesson complete", {
        description: res.data?.courseCompleted ? "Your certificate is ready on the Certificates page." : "Your progress is saved.",
        action: nextHref ? { label: "Next lesson", onClick: () => router.push(nextHref) } : undefined,
      });
    });

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between md:p-6">
      <div className="flex items-center gap-3">
        {completed ? (
          <span className="grid size-9 place-items-center rounded-pill bg-olive text-white">
            <Check aria-hidden className="size-5 stroke-[2.5]" />
          </span>
        ) : null}
        <div>
          <p className="font-ui text-[16px] font-semibold text-ink">{completed ? "Lesson complete" : "Finished this lesson?"}</p>
          <p className="text-[15px] text-muted">{completed ? "Nice work. Keep going while it is fresh." : (hint ?? "Mark it complete to update your progress.")}</p>
        </div>
      </div>
      {completed ? (
        nextHref ? (
          <Button onClick={() => router.push(nextHref)} size="lg">
            Next lesson <ArrowRight aria-hidden />
          </Button>
        ) : null
      ) : (
        <Button onClick={complete} loading={pending} size="lg">
          <Check aria-hidden /> {label}
        </Button>
      )}
    </div>
  );
}

export function PdfLesson({
  lessonId,
  viewUrl,
  fileName,
  fileSize,
  completed,
  nextHref,
}: {
  lessonId: string;
  viewUrl: string;
  fileName: string | null;
  fileSize: number | null;
  completed: boolean;
  nextHref?: string | null;
}) {
  const downloadHref = `/api/media/lesson/${lessonId}?kind=file&mode=download&redirect=1`;
  return (
    <div className="space-y-5">
      <div className="hidden overflow-hidden rounded-lg bg-card shadow-card md:block">
        <iframe src={`${viewUrl}#view=FitH`} title={fileName ?? "PDF document"} className="h-[72vh] min-h-[520px] w-full border-0 bg-sunken" />
      </div>
      <div className="flex items-center gap-4 rounded-lg bg-card p-5 shadow-card md:hidden">
        <span className="grid size-12 shrink-0 place-items-center rounded-md bg-sunken text-body">
          <FileText aria-hidden className="size-6 stroke-[1.75]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-[15px] font-semibold text-ink">{fileName ?? "Document"}</p>
          <p className="text-[15px] text-muted">PDF{fileSize ? ` · ${formatBytes(fileSize)}` : ""}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <a href={viewUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden /> Open PDF
          </a>
        </Button>
        <Button asChild variant="ghost">
          <a href={downloadHref}>
            <Download aria-hidden /> Download
          </a>
        </Button>
      </div>
      <CompleteControl lessonId={lessonId} completed={completed} nextHref={nextHref} hint="Read it through, then mark it complete." />
    </div>
  );
}

export function DocumentLesson({
  lessonId,
  fileName,
  fileSize,
  completed,
  nextHref,
}: {
  lessonId: string;
  fileName: string | null;
  fileSize: number | null;
  completed: boolean;
  nextHref?: string | null;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-5 rounded-lg bg-card p-6 shadow-card sm:flex-row sm:items-center md:p-8">
        <span className="grid size-14 shrink-0 place-items-center rounded-md bg-sunken text-body">
          <FileDown aria-hidden className="size-7 stroke-[1.5]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-ui text-[17px] font-semibold text-ink">{fileName ?? "Document"}</p>
          <p className="mt-0.5 text-[15px] text-muted">{fileSize ? formatBytes(fileSize) : "Download to read offline or share with clients."}</p>
        </div>
        <Button asChild size="lg">
          <a href={`/api/media/lesson/${lessonId}?kind=file&mode=download&redirect=1`}>
            <Download aria-hidden /> Download
          </a>
        </Button>
      </div>
      <CompleteControl lessonId={lessonId} completed={completed} nextHref={nextHref} />
    </div>
  );
}

/** A video that lives on Google Drive or Wistia. Those players do not report progress, so the agent marks it. */
export function EmbedVideoLesson({
  lessonId,
  url,
  title,
  completed,
  nextHref,
}: {
  lessonId: string;
  url: string;
  title: string;
  completed: boolean;
  nextHref?: string | null;
}) {
  return (
    <div className="space-y-5">
      <div className="xm-theatre">
        <div className="xm-theatre-frame aspect-video">
          <iframe src={url} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="size-full border-0" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[900px] px-4 md:px-8">
        <CompleteControl lessonId={lessonId} completed={completed} nextHref={nextHref} hint="Finished watching? Mark this lesson complete." />
      </div>
    </div>
  );
}

export function LinkLesson({
  lessonId,
  url,
  completed: initial,
  nextHref,
}: {
  lessonId: string;
  url: string;
  completed: boolean;
  nextHref?: string | null;
}) {
  const [opened, setOpened] = useState(initial);
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  return (
    <div className="space-y-5">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setOpened(true)}
        className="group flex items-center gap-5 rounded-lg bg-card p-6 shadow-card transition-[transform,box-shadow] duration-200 ease-standard hover:-translate-y-[3px] hover:shadow-raised md:p-8"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-md bg-turquoise text-black">
          <ExternalLink aria-hidden className="size-6 stroke-[1.75]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="xm-micro text-muted">External site · opens in a new tab</span>
          <span className="mt-1 block truncate font-ui text-[18px] font-semibold text-ink group-hover:text-link">{host}</span>
        </span>
        <ArrowRight aria-hidden className="size-5 shrink-0 stroke-[2] text-muted transition-transform duration-200 group-hover:translate-x-1" />
      </a>
      {opened ? (
        <CompleteControl lessonId={lessonId} completed={initial} nextHref={nextHref} hint="Back from the site? Mark this lesson complete." />
      ) : (
        <p className="text-[15px] text-muted">Open the link to unlock completion for this lesson.</p>
      )}
    </div>
  );
}
