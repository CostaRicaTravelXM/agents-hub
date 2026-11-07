"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteFamTrip, saveFamTrip } from "@/app/actions/hub-admin";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { notify } from "@/components/ui/toast";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { FormFooter, PhotoField, StatusField, TitleSlugFields, useSlug, type Status } from "@/components/admin/hub-form-bits";
import { FAM_SEGMENTS } from "@/lib/hub/fam";
import type { Tables } from "@/lib/database.types";

type FamTrip = Tables<"hub_fam_trips">;
type Segment = "classic" | "luxury" | "romance" | "wellness" | "adventure" | "family" | "groups" | "business";

export function FamTripForm({ item }: { item?: FamTrip }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const s = useSlug(item?.title ?? "", item?.slug ?? "", Boolean(item));
  const [timing, setTiming] = useState(item?.timing_label ?? "");
  const [startsOn, setStartsOn] = useState(item?.starts_on ?? "");
  const [nights, setNights] = useState(item ? String(item.nights) : "6");
  const [regions, setRegions] = useState(item?.regions.join(", ") ?? "");
  const [segments, setSegments] = useState<Segment[]>((item?.segments as Segment[]) ?? []);
  const [summary, setSummary] = useState(item?.summary ?? "");
  const [expect, setExpect] = useState(item?.expect ?? "");
  const [body, setBody] = useState<unknown>(item?.body ?? null);
  const [image, setImage] = useState<string | null>(item?.image_key ?? null);
  const [imageAlt, setImageAlt] = useState(item?.image_alt ?? "");
  const [ctaUrl, setCtaUrl] = useState(item?.cta_url ?? "");
  const [ctaLabel, setCtaLabel] = useState(item?.cta_label ?? "Register interest");
  const [status, setStatus] = useState<Status>(item?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await saveFamTrip(item?.id ?? null, {
        title: s.title,
        slug: s.slug,
        timing_label: timing,
        starts_on: startsOn,
        nights: Number(nights),
        regions: regions.split(",").map((x) => x.trim()).filter(Boolean),
        segments,
        summary,
        expect,
        body,
        image_key: image,
        image_alt: imageAlt,
        cta_url: ctaUrl,
        cta_label: ctaLabel,
        status,
      });
      if (!r.ok) {
        setError(r.error);
        return void notify.error("Not saved", { description: r.error });
      }
      notify.success(item ? "Trip saved" : "Trip created");
      if (!item && r.data) router.push(`/admin/fam-trips/${r.data.id}`);
    });

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
        <TitleSlugFields s={s} base="/fam-trips" />
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="When" htmlFor="timing" hint="As agents see it, e.g. “Nov 2026”.">
            <Input id="timing" value={timing} onChange={(e) => setTiming(e.target.value)} maxLength={40} required />
          </Field>
          <Field label="Start date" htmlFor="starts_on" optional hint="For sorting, once confirmed.">
            <Input id="starts_on" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </Field>
          <Field label="Nights" htmlFor="nights">
            <Input id="nights" type="number" min={1} max={30} inputMode="numeric" value={nights} onChange={(e) => setNights(e.target.value)} required />
          </Field>
        </div>
        <Field label="Regions" htmlFor="regions" hint="Separate with commas: Guanacaste, Arenal.">
          <Input id="regions" value={regions} onChange={(e) => setRegions(e.target.value)} />
        </Field>
        <fieldset>
          <legend className="font-ui text-[14px] font-semibold text-ink">Who it is for</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {FAM_SEGMENTS.map((seg) => {
              const on = segments.includes(seg.key as Segment);
              return (
                <label key={seg.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-line bg-card px-3">
                  <Checkbox checked={on} onCheckedChange={(c) => setSegments((cur) => (c === true ? [...cur, seg.key as Segment] : cur.filter((k) => k !== seg.key)))} />
                  <span className="text-[15px] text-ink">{seg.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <Field label="Summary" htmlFor="summary" hint="One line on the card and the first paragraph of the page.">
          <Textarea id="summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={600} required />
        </Field>
        <Field label="What advisors can expect" htmlFor="expect" optional>
          <Textarea id="expect" rows={3} value={expect} onChange={(e) => setExpect(e.target.value)} maxLength={1000} />
        </Field>
        <div>
          <p className="mb-2 font-ui text-[14px] font-semibold text-ink">
            The details <span className="ml-1.5 font-normal text-muted">optional</span>
          </p>
          <div className="rounded-lg bg-card shadow-card">
            <RichTextEditor value={body} onChange={setBody} label="Trip details" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Field label="Interest form link" htmlFor="cta_url" optional hint="The Zoho form (https://forms.zohopublic.com/…). The agent’s name and email are filled in automatically. Empty: agents email sales@travelxm.com.">
            <Input id="cta_url" type="url" inputMode="url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
          </Field>
          <Field label="Button text" htmlFor="cta_label">
            <Input id="cta_label" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={40} />
          </Field>
        </div>
        <StatusField value={status} onChange={setStatus} />
        <FormFooter
          pending={pending}
          saveLabel={item ? "Save trip" : "Create trip"}
          error={error}
          onDelete={item ? () => deleteFamTrip(item.id) : undefined}
          deleteTitle={item ? `Delete “${item.title}”?` : undefined}
          afterDelete="/admin/fam-trips"
        />
      </div>
      <div className="space-y-5">
        <PhotoField value={image} onChange={setImage} scope="fam-trips" label="Trip photo" hint="Landscape JPG or WebP, at least 1600 px wide." slotLabel="Trip photo" />
        <Field label="Photo description" htmlFor="image_alt" optional hint="For screen readers: what is in the photo.">
          <Input id="image_alt" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} maxLength={200} />
        </Field>
      </div>
    </form>
  );
}
