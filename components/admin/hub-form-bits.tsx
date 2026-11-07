"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form";
import { Confirm } from "@/components/ui/overlay";
import { notify } from "@/components/ui/toast";
import { Uploader } from "@/components/admin/uploader";
import { mediaUrl } from "@/lib/media";
import { slugify } from "@/lib/utils";

export type Status = "draft" | "published" | "archived";

/** Title + URL slug pair: the slug follows the title until someone edits it. */
export function useSlug(initialTitle: string, initialSlug: string, isExisting: boolean) {
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [touched, setTouched] = useState(isExisting);
  return {
    title,
    slug,
    onTitle: (v: string) => {
      setTitle(v);
      if (!touched) setSlug(slugify(v));
    },
    onSlug: (v: string) => {
      setTouched(true);
      setSlug(slugify(v));
    },
  };
}

export function TitleSlugFields({ s, base, titleLabel = "Title" }: { s: ReturnType<typeof useSlug>; base: string; titleLabel?: string }) {
  return (
    <>
      <Field label={titleLabel} htmlFor="title">
        <Input id="title" value={s.title} onChange={(e) => s.onTitle(e.target.value)} required />
      </Field>
      <Field label="URL slug" htmlFor="slug" hint={`${base}/${s.slug || "…"}`}>
        <Input id="slug" value={s.slug} onChange={(e) => s.onSlug(e.target.value)} />
      </Field>
    </>
  );
}

export function StatusField({ value, onChange, hint }: { value: Status; onChange: (v: Status) => void; hint?: string }) {
  return (
    <Field label="Status" htmlFor="status" hint={hint ?? "Only published items are visible to agents."}>
      <NativeSelect id="status" value={value} onChange={(e) => onChange(e.target.value as Status)}>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </NativeSelect>
    </Field>
  );
}

/** Photo upload with a live preview, for covers and posters. */
export function PhotoField({
  value,
  onChange,
  scope,
  label,
  hint,
  slotLabel,
  ratio = "16/10",
}: {
  value: string | null;
  onChange: (key: string | null) => void;
  scope: string;
  label: string;
  hint?: string;
  slotLabel: string;
  ratio?: "16/10" | "16/9" | "3/4";
}) {
  const url = mediaUrl(value);
  const ratioClass = ratio === "16/9" ? "aspect-video" : ratio === "3/4" ? "aspect-[3/4] max-w-[260px]" : "aspect-[16/10]";
  return (
    <div className="space-y-3">
      <div className={`relative overflow-hidden rounded-lg bg-sunken ${ratioClass}`}>
        {url ? (
          <Image src={url} alt="" fill sizes="340px" className="object-cover" />
        ) : (
          <div className="xm-photo-slot absolute inset-0">
            <span className="xm-photo-slot__label">{slotLabel}</span>
          </div>
        )}
      </div>
      <Uploader
        kind="image"
        scope={scope}
        label={label}
        hint={hint}
        current={value ? { name: value.split("/").pop() ?? "photo" } : null}
        onUploaded={(u) => onChange(u.key)}
        onClear={() => onChange(null)}
      />
    </div>
  );
}

/** Save button plus the delete confirmation, shared by every hub form. */
export function FormFooter({
  pending,
  saveLabel,
  error,
  onDelete,
  deleteTitle,
  deleteBody,
  afterDelete,
}: {
  pending: boolean;
  saveLabel: string;
  error: string | null;
  onDelete?: () => Promise<{ ok: boolean; error?: string }>;
  deleteTitle?: string;
  deleteBody?: string;
  afterDelete?: string;
}) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="text-[14px] text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={pending}>
          {saveLabel}
        </Button>
        {onDelete ? (
          <Confirm
            trigger={
              <button type="button" className="inline-flex h-11 items-center gap-2 rounded-md px-3 font-ui text-[15px] font-semibold text-danger hover:bg-sunken">
                <Trash2 aria-hidden className="size-5 stroke-[1.75]" /> Delete
              </button>
            }
            title={deleteTitle ?? "Delete this item?"}
            body={deleteBody ?? "Agents will no longer see it. This cannot be undone."}
            confirmLabel="Delete"
            destructive
            onConfirm={async () => {
              const r = await onDelete();
              if (!r.ok) return void notify.error("Not deleted", { description: r.error });
              notify.success("Deleted");
              if (afterDelete) router.push(afterDelete);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** "2026-11-06" from a Date input, or "" when empty. */
export function dateValue(v: string | null | undefined) {
  return v ?? "";
}
