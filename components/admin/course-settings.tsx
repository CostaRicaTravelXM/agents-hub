"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Globe, Link2, Trash2, Users } from "lucide-react";
import { addResource, deleteCourse, deleteResource, setCourseAccess } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Radio, RadioGroup } from "@/components/ui/form";
import { Confirm } from "@/components/ui/overlay";
import { notify } from "@/components/ui/toast";
import { Uploader, type Uploaded } from "@/components/admin/uploader";
import { cn, formatBytes } from "@/lib/utils";

type Status = "draft" | "published" | "archived";
type Visibility = "public" | "groups";

export function AccessEditor({
  courseId,
  status: s0,
  visibility: v0,
  groups,
  selected,
  lessonCount,
}: {
  courseId: string;
  status: Status;
  visibility: Visibility;
  groups: { id: string; name: string; members: number }[];
  selected: string[];
  lessonCount: number;
}) {
  const [status, setStatus] = useState<Status>(s0);
  const [visibility, setVisibility] = useState<Visibility>(v0);
  const [groupIds, setGroupIds] = useState<string[]>(selected);
  const [pending, start] = useTransition();

  const statusOptions: { id: Status; title: string; body: string }[] = [
    { id: "draft", title: "Draft", body: "Only staff can see it. Build and preview safely." },
    { id: "published", title: "Published", body: "Agents with access see it in the catalog and can enroll." },
    { id: "archived", title: "Archived", body: "Hidden from agents. Progress and certificates are kept." },
  ];

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setCourseAccess(courseId, { status, visibility, groupIds });
          if (!r.ok) return void notify.error("Access not saved", { description: r.error });
          notify.success(status === "published" ? "Course published" : "Access saved");
        });
      }}
    >
      <fieldset>
        <legend className="font-ui text-[16px] font-semibold text-ink">Status</legend>
        <RadioGroup value={status} onValueChange={(v) => setStatus(v as Status)} className="mt-3 grid gap-3 md:grid-cols-3">
          {statusOptions.map((o) => (
            <label
              key={o.id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-md border-2 p-4 transition-colors duration-120",
                status === o.id ? "border-primary bg-primary/5" : "border-line hover:border-[#cfc6b1]",
              )}
            >
              <Radio value={o.id} className="mt-0.5" />
              <span>
                <span className="block font-ui text-[15px] font-semibold text-ink">{o.title}</span>
                <span className="block text-[13px] text-muted">{o.body}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
        {status === "published" && lessonCount === 0 ? (
          <p className="mt-3 text-[14px] text-danger">This course has no lessons yet. Agents would see an empty syllabus.</p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="font-ui text-[16px] font-semibold text-ink">Who can see this course</legend>
        <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as Visibility)} className="mt-3 grid gap-3 md:grid-cols-2">
          {[
            { id: "public" as const, icon: Globe, title: "Every registered agent", body: "Anyone with an account can find and take it." },
            { id: "groups" as const, icon: Users, title: "Selected groups only", body: "Other agents never see it in the catalog." },
          ].map((o) => (
            <label
              key={o.id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-md border-2 p-4 transition-colors duration-120",
                visibility === o.id ? "border-primary bg-primary/5" : "border-line hover:border-[#cfc6b1]",
              )}
            >
              <Radio value={o.id} className="mt-0.5" />
              <span>
                <span className="flex items-center gap-2 font-ui text-[15px] font-semibold text-ink">
                  <o.icon aria-hidden className="size-4 stroke-[2] text-muted" /> {o.title}
                </span>
                <span className="block text-[13px] text-muted">{o.body}</span>
              </span>
            </label>
          ))}
        </RadioGroup>

        {visibility === "groups" ? (
          <div className="mt-4 rounded-md border border-line p-4">
            <p className="mb-3 font-ui text-[14px] font-semibold text-ink">Groups with access</p>
            {groups.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-3 rounded-md bg-page px-3 py-2.5 text-[14px]">
                    <Checkbox
                      checked={groupIds.includes(g.id)}
                      onCheckedChange={(c) => setGroupIds((ids) => (c ? [...ids, g.id] : ids.filter((x) => x !== g.id)))}
                    />
                    <span className="flex-1 text-ink">{g.name}</span>
                    <span className="text-[13px] text-muted">{g.members} members</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-muted">
                No groups yet.{" "}
                <Link href="/admin/groups" className="xm-link">
                  Create a group
                </Link>{" "}
                first.
              </p>
            )}
          </div>
        ) : null}
      </fieldset>

      <Button type="submit" size="lg" loading={pending}>
        Save access
      </Button>
    </form>
  );
}

export function ResourcesEditor({
  courseId,
  resources,
}: {
  courseId: string;
  resources: { id: string; title: string; description: string | null; file_name: string | null; file_size: number | null; external_url: string | null }[];
}) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<Uploaded | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div>
        {resources.length ? (
          <ul className="divide-y divide-line rounded-md border border-line">
            {resources.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sunken text-body">
                  {r.external_url ? <ExternalLink aria-hidden className="size-4 stroke-[2]" /> : <Link2 aria-hidden className="size-4 stroke-[2]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-[14px] font-semibold text-ink">{r.title}</p>
                  <p className="truncate text-[13px] text-muted">
                    {r.external_url ?? `${r.file_name ?? "File"}${r.file_size ? ` · ${formatBytes(r.file_size)}` : ""}`}
                  </p>
                </div>
                <Confirm
                  trigger={
                    <button type="button" aria-label={`Delete ${r.title}`} className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-danger">
                      <Trash2 aria-hidden className="size-4 stroke-[2]" />
                    </button>
                  }
                  title="Delete this resource?"
                  body="Agents will no longer see it in the course or the Resources library."
                  confirmLabel="Delete"
                  destructive
                  onConfirm={async () => {
                    const res = await deleteResource(r.id);
                    if (!res.ok) notify.error("Not deleted", { description: res.error });
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-[#d6cdb8] p-6 text-center text-[14px] text-muted">
            No resources yet. Add fact sheets, rate sheets and brochures agents can download.
          </p>
        )}
      </div>

      <form
        className="space-y-4 rounded-md bg-page p-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addResource(courseId, {
              title,
              description,
              ...(mode === "file" && file
                ? { file_key: file.key, file_name: file.name, file_size: file.size, file_mime: file.type }
                : { external_url: url || null }),
            });
            if (!r.ok) return void notify.error("Resource not added", { description: r.error });
            notify.success("Resource added");
            setTitle("");
            setDescription("");
            setUrl("");
            setFile(null);
          });
        }}
      >
        <p className="font-ui text-[15px] font-semibold text-ink">Add a resource</p>
        <div className="inline-flex rounded-md border border-line bg-card p-1">
          {(["file", "link"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn("h-8 rounded-sm px-3 font-ui text-[13px] font-semibold", mode === m ? "bg-ink text-cloudy" : "text-body hover:bg-sunken")}
            >
              {m === "file" ? "Upload file" : "Link"}
            </button>
          ))}
        </div>
        <Field label="Title" htmlFor="res-title">
          <Input id="res-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Short description" htmlFor="res-desc" optional>
          <Input id="res-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {mode === "file" ? (
          <Uploader
            kind="document"
            scope={`resources-${courseId.slice(0, 8)}`}
            label="File"
            hint="PDF, Word, PowerPoint or Excel, up to 200 MB."
            current={file ? { name: file.name, size: file.size } : null}
            onUploaded={(u) => {
              setFile(u);
              if (!title) setTitle(u.name.replace(/\.[^.]+$/, ""));
            }}
            onClear={() => setFile(null)}
          />
        ) : (
          <Field label="URL" htmlFor="res-url">
            <Input id="res-url" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
        )}
        <Button type="submit" loading={pending} disabled={title.trim().length < 2 || (mode === "file" ? !file : !url)}>
          Add resource
        </Button>
      </form>
    </div>
  );
}

export function DangerZone({ courseId, title, isAdmin }: { courseId: string; title: string; isAdmin: boolean }) {
  if (!isAdmin) return <p className="text-[14px] text-muted">Only admins can delete a course. Archive it from the Access tab instead.</p>;
  return (
    <Confirm
      trigger={
        <Button variant="danger">
          <Trash2 aria-hidden /> Delete course
        </Button>
      }
      title={`Delete “${title}”?`}
      body="Every module, lesson, enrollment, quiz attempt and certificate for this course is deleted. Archive it instead if agents should keep their certificates."
      confirmLabel="Delete permanently"
      destructive
      onConfirm={async () => {
        const r = await deleteCourse(courseId);
        if (r && !r.ok) notify.error("Not deleted", { description: r.error });
      }}
    />
  );
}
