"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOffer, saveOffer } from "@/app/actions/hub-admin";
import { Field, Input, Textarea } from "@/components/ui/form";
import { notify } from "@/components/ui/toast";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Uploader } from "@/components/admin/uploader";
import { FormFooter, PhotoField, StatusField, TitleSlugFields, useSlug, type Status } from "@/components/admin/hub-form-bits";
import type { Tables } from "@/lib/database.types";

type Offer = Tables<"hub_offers">;

export function OfferForm({ item }: { item?: Offer }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const s = useSlug(item?.title ?? "", item?.slug ?? "", Boolean(item));
  const [excerpt, setExcerpt] = useState(item?.excerpt ?? "");
  const [body, setBody] = useState<unknown>(item?.body ?? null);
  const [image, setImage] = useState<string | null>(item?.image_key ?? null);
  const [from, setFrom] = useState(item?.valid_from ?? "");
  const [until, setUntil] = useState(item?.valid_until ?? "");
  const [file, setFile] = useState<{ key: string; name: string; size: number | null } | null>(
    item?.file_key ? { key: item.file_key, name: item.file_name ?? "offer.pdf", size: item.file_size ?? null } : null,
  );
  const [link, setLink] = useState(item?.link_url ?? "");
  const [ctaUrl, setCtaUrl] = useState(item?.cta_url ?? "");
  const [ctaLabel, setCtaLabel] = useState(item?.cta_label ?? "");
  const [status, setStatus] = useState<Status>(item?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await saveOffer(item?.id ?? null, {
        title: s.title,
        slug: s.slug,
        excerpt,
        body,
        image_key: image,
        valid_from: from,
        valid_until: until,
        file_key: file?.key ?? null,
        file_name: file?.name ?? null,
        file_size: file?.size ?? null,
        link_url: link,
        cta_url: ctaUrl,
        cta_label: ctaLabel,
        status,
      });
      if (!r.ok) {
        setError(r.error);
        return void notify.error("Not saved", { description: r.error });
      }
      notify.success(item ? "Offer saved" : "Offer created");
      if (!item && r.data) router.push(`/admin/offers/${r.data.id}`);
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
        <TitleSlugFields s={s} base="/offers" />
        <Field label="Short description" htmlFor="excerpt" optional hint="One or two lines on the card.">
          <Textarea id="excerpt" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={300} />
        </Field>
        <div>
          <p className="mb-2 font-ui text-[14px] font-semibold text-ink">
            The offer <span className="ml-1.5 font-normal text-muted">optional</span>
          </p>
          <div className="rounded-lg bg-card shadow-card">
            <RichTextEditor value={body} onChange={setBody} label="Offer details" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Starts" htmlFor="valid_from" optional>
            <Input id="valid_from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Ends" htmlFor="valid_until" optional hint="After this date the offer disappears for agents.">
            <Input id="valid_until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </Field>
        </div>
        <Uploader
          kind="document"
          scope="offers"
          label="PDF"
          hint="A flyer or rate sheet, up to 200 MB."
          current={file}
          onUploaded={(u) => setFile({ key: u.key, name: u.name, size: u.size })}
          onClear={() => setFile(null)}
        />
        <Field label="Web link" htmlFor="link" optional hint="A page with more about the offer.">
          <Input id="link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Field label="Interest form link" htmlFor="cta_url" optional hint="A Zoho form (https://forms.zohopublic.com/…). Name and email are filled in automatically.">
            <Input id="cta_url" type="url" inputMode="url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
          </Field>
          <Field label="Button text" htmlFor="cta_label" optional hint="Default: “I’m interested”.">
            <Input id="cta_label" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={40} />
          </Field>
        </div>
        <StatusField value={status} onChange={setStatus} />
        <FormFooter
          pending={pending}
          saveLabel={item ? "Save offer" : "Create offer"}
          error={error}
          onDelete={item ? () => deleteOffer(item.id) : undefined}
          deleteTitle={item ? `Delete “${item.title}”?` : undefined}
          afterDelete="/admin/offers"
        />
      </div>
      <PhotoField value={image} onChange={setImage} scope="offers" label="Offer photo" hint="Landscape JPG or WebP, at least 1600 px wide." slotLabel="Offer photo" />
    </form>
  );
}
