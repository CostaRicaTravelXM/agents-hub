"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { deleteLesson, updateLesson } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch, Textarea } from "@/components/ui/form";
import { Confirm } from "@/components/ui/overlay";
import { notify } from "@/components/ui/toast";
import { Uploader } from "@/components/admin/uploader";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { mediaUrl } from "@/lib/media";
import { formatClock } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";

type Lesson = Tables<"lessons">;

export function LessonEditor({ lesson, courseId }: { lesson: Lesson; courseId: string }) {
  const [title, setTitle] = useState(lesson.title);
  const [summary, setSummary] = useState(lesson.summary ?? "");
  const [duration, setDuration] = useState(lesson.duration_seconds ? String(Math.round(lesson.duration_seconds / 60)) : "");
  const [durationSeconds, setDurationSeconds] = useState<number | null>(lesson.duration_seconds);
  const [video, setVideo] = useState<{ key: string; name: string; size?: number } | null>(lesson.video_key ? { key: lesson.video_key, name: lesson.video_key.split("/").pop()! } : null);
  const [poster, setPoster] = useState<string | null>(lesson.poster_key);
  const [file, setFile] = useState<{ key: string; name: string; size: number | null; type: string | null } | null>(
    lesson.file_key ? { key: lesson.file_key, name: lesson.file_name ?? "Document", size: lesson.file_size, type: lesson.file_mime } : null,
  );
  const [url, setUrl] = useState(lesson.external_url ?? "");
  const [body, setBody] = useState<unknown>(lesson.body);
  const [requiredPct, setRequiredPct] = useState(String(lesson.required_completion_pct));
  const [isRequired, setIsRequired] = useState(lesson.is_required);
  const [pending, start] = useTransition();

  const t = lesson.type;
  const posterUrl = mediaUrl(poster);

  const save = () =>
    start(async () => {
      const r = await updateLesson(lesson.id, {
        title,
        summary,
        duration_seconds: t === "video" ? durationSeconds : duration ? Number(duration) * 60 : null,
        video_key: t === "video" ? (video?.key ?? null) : null,
        poster_key: t === "video" ? poster : null,
        file_key: t === "pdf" || t === "document" ? (file?.key ?? null) : null,
        file_name: t === "pdf" || t === "document" ? (file?.name ?? null) : null,
        file_size: t === "pdf" || t === "document" ? (file?.size ?? null) : null,
        file_mime: t === "pdf" || t === "document" ? (file?.type ?? null) : null,
        external_url: t === "link" || t === "video" ? url : null,
        body: t === "reading" ? body : null,
        required_completion_pct: Number(requiredPct) || 90,
        is_required: isRequired,
      });
      if (!r.ok) return void notify.error("Lesson not saved", { description: r.error });
      notify.success("Lesson saved");
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
      noValidate
    >
      <div className="space-y-6">
        <div className="space-y-5 rounded-lg bg-card p-5 shadow-card md:p-6">
          <Field label="Lesson title" htmlFor="l-title">
            <Input id="l-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Summary" htmlFor="l-summary" optional hint="One or two sentences shown under the title and in the syllabus.">
            <Textarea id="l-summary" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={400} />
          </Field>
        </div>

        {t === "video" ? (
          <div className="space-y-5 rounded-lg bg-card p-5 shadow-card md:p-6">
            <Uploader
              kind="video"
              scope={courseId.slice(0, 8)}
              label="Video file"
              hint="MP4 (H.264 + AAC) up to 5 GB. 1080p is plenty; use a fast-start export."
              current={video ? { name: video.name, size: video.size } : null}
              onUploaded={(u) => {
                setVideo({ key: u.key, name: u.name, size: u.size });
                if (u.durationSeconds) setDurationSeconds(u.durationSeconds);
              }}
              onClear={() => setVideo(null)}
            />
            <Field
              label="Or a link to the video"
              htmlFor="l-video-url"
              optional
              hint="Paste a Google Drive or Wistia link instead of uploading. A Drive file must be shared as “Anyone with the link”. An uploaded video is used first when there are both."
            >
              <Input id="l-video-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/file/d/…/view" />
            </Field>
            <p className="text-[14px] text-muted">
              Duration: <span className="font-semibold text-ink">{durationSeconds ? formatClock(durationSeconds) : "set automatically from the upload"}</span>
            </p>
            <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
              <div className="relative aspect-video overflow-hidden rounded-md bg-sunken">
                {posterUrl ? <Image src={posterUrl} alt="Poster" fill sizes="200px" className="object-cover" /> : <div className="xm-photo-slot absolute inset-0"><span className="xm-photo-slot__label">Poster frame</span></div>}
              </div>
              <Uploader
                kind="image"
                scope="posters"
                label="Poster image"
                hint="Shown before the video plays. 16:9 JPG or WebP."
                current={poster ? { name: poster.split("/").pop()! } : null}
                onUploaded={(u) => setPoster(u.key)}
                onClear={() => setPoster(null)}
              />
            </div>
          </div>
        ) : null}

        {t === "pdf" || t === "document" ? (
          <div className="rounded-lg bg-card p-5 shadow-card md:p-6">
            <Uploader
              kind="document"
              scope={courseId.slice(0, 8)}
              label={t === "pdf" ? "PDF file" : "Document"}
              hint={t === "pdf" ? "Agents read it inside the lesson and can download it." : "Word, PowerPoint, Excel or PDF. Agents download it."}
              current={file ? { name: file.name, size: file.size } : null}
              onUploaded={(u) => setFile({ key: u.key, name: u.name, size: u.size, type: u.type })}
              onClear={() => setFile(null)}
            />
          </div>
        ) : null}

        {t === "link" ? (
          <div className="rounded-lg bg-card p-5 shadow-card md:p-6">
            <Field label="External URL" htmlFor="l-url" hint="Opens in a new tab. The lesson completes when the agent confirms they read it.">
              <Input id="l-url" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
            </Field>
          </div>
        ) : null}

        {t === "reading" ? <RichTextEditor value={body} onChange={setBody} label="Lesson content" /> : null}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <div className="space-y-5 rounded-lg bg-card p-5 shadow-card">
          <p className="font-ui text-[16px] font-semibold text-ink">Completion rules</p>
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-ui text-[14px] font-semibold text-ink">Required lesson</span>
              <span className="block text-[13px] text-muted">Counts toward course completion and module unlocks.</span>
            </span>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} aria-label="Required lesson" />
          </label>
          {t === "video" ? (
            <Field label="Watch required to complete (%)" htmlFor="l-pct" hint="Measured on seconds actually played, so skipping ahead does not count.">
              <Input id="l-pct" type="number" min={1} max={100} value={requiredPct} onChange={(e) => setRequiredPct(e.target.value)} />
            </Field>
          ) : t !== "quiz" ? (
            <Field label="Estimated minutes" htmlFor="l-min" optional>
              <Input id="l-min" type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </Field>
          ) : (
            <p className="text-[13px] text-muted">Quiz lessons complete when the agent reaches the passing score.</p>
          )}
          <Button type="submit" block loading={pending}>
            Save lesson
          </Button>
        </div>
        <Confirm
          trigger={
            <Button type="button" variant="danger" block>
              <Trash2 aria-hidden /> Delete lesson
            </Button>
          }
          title={`Delete “${lesson.title}”?`}
          body="The lesson, its media and every agent's progress on it are deleted. This cannot be undone."
          confirmLabel="Delete lesson"
          destructive
          onConfirm={async () => {
            const r = await deleteLesson(lesson.id, courseId);
            if (r && !r.ok) notify.error("Not deleted", { description: r.error });
          }}
        />
      </aside>
    </form>
  );
}
