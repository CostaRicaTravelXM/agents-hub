"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { createCourse, updateCourse } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Switch, Textarea } from "@/components/ui/form";
import { notify } from "@/components/ui/toast";
import { Uploader } from "@/components/admin/uploader";
import { mediaUrl } from "@/lib/media";
import { slugify } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";

type Course = Pick<
  Tables<"courses">,
  "id" | "title" | "slug" | "subtitle" | "description" | "category_id" | "level" | "estimated_minutes" | "certificate_enabled" | "featured" | "cover_key"
>;

export function CourseForm({ course, categories }: { course?: Course; categories: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(course?.title ?? "");
  const [slug, setSlug] = useState(course?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(course));
  const [subtitle, setSubtitle] = useState(course?.subtitle ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [categoryId, setCategoryId] = useState(course?.category_id ?? "");
  const [level, setLevel] = useState(course?.level ?? "foundation");
  const [minutes, setMinutes] = useState(course?.estimated_minutes?.toString() ?? "");
  const [certificate, setCertificate] = useState(course?.certificate_enabled ?? true);
  const [featured, setFeatured] = useState(course?.featured ?? false);
  const [cover, setCover] = useState<string | null>(course?.cover_key ?? null);
  const [error, setError] = useState<string | null>(null);

  const submit = () =>
    start(async () => {
      setError(null);
      const payload = {
        title,
        slug: slug || slugify(title),
        subtitle,
        description,
        category_id: categoryId || null,
        level: level as "foundation" | "advanced" | "specialist",
        estimated_minutes: minutes ? Number(minutes) : null,
        certificate_enabled: certificate,
        featured,
        cover_key: cover,
      };
      const res = course ? await updateCourse(course.id, payload) : await createCourse(payload);
      if (res && !res.ok) {
        setError(res.error);
        notify.error("Not saved", { description: res.error });
      } else if (course) notify.success("Course saved");
    });

  const coverUrl = mediaUrl(cover);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
      noValidate
    >
      <div className="space-y-5">
        <Field label="Title" htmlFor="title">
          <Input
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            required
          />
        </Field>
        <Field label="URL slug" htmlFor="slug" hint={`academy.travelxm.com/courses/${slug || "…"}`}>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="Subtitle" htmlFor="subtitle" optional hint="One line under the title on the course card.">
          <Input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Description" htmlFor="description" hint="What the agent will learn and how long it takes. Concrete nouns and numbers.">
          <Textarea id="description" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Category" htmlFor="category">
            <NativeSelect id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Level" htmlFor="level">
            <NativeSelect id="level" value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
              <option value="foundation">Foundation</option>
              <option value="advanced">Advanced</option>
              <option value="specialist">Specialist</option>
            </NativeSelect>
          </Field>
          <Field label="Estimated minutes" htmlFor="minutes" optional>
            <Input id="minutes" type="number" min={0} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </Field>
        </div>
        <div className="space-y-4 rounded-md border border-line p-4">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block font-ui text-[14px] font-semibold text-ink">Certificate on completion</span>
              <span className="block text-[13px] text-muted">Issued automatically when every required lesson is complete.</span>
            </span>
            <Switch checked={certificate} onCheckedChange={setCertificate} aria-label="Certificate on completion" />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block font-ui text-[14px] font-semibold text-ink">Featured</span>
              <span className="block text-[13px] text-muted">Recommended first on the agent dashboard.</span>
            </span>
            <Switch checked={featured} onCheckedChange={setFeatured} aria-label="Featured" />
          </label>
        </div>
        {error ? (
          <p role="alert" className="text-[14px] text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" loading={pending}>
          {course ? "Save details" : "Create course"}
        </Button>
      </div>

      <div className="space-y-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-sunken">
          {coverUrl ? (
            <Image src={coverUrl} alt="Course cover" fill sizes="340px" className="object-cover" />
          ) : (
            <div className="xm-photo-slot absolute inset-0">
              <span className="xm-photo-slot__label">Course cover photo</span>
            </div>
          )}
        </div>
        <Uploader
          kind="image"
          scope="covers"
          label="Cover photo"
          hint="Landscape JPG or WebP, at least 1600 px wide. Warm, saturated daylight."
          current={cover ? { name: cover.split("/").pop() ?? "cover" } : null}
          onUploaded={(u) => setCover(u.key)}
          onClear={() => setCover(null)}
        />
      </div>
    </form>
  );
}
