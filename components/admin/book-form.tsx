"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, RefreshCw } from "lucide-react";
import { deleteBook, inspectBookAction, prepareBookPages, saveBook } from "@/app/actions/hub-admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { notify } from "@/components/ui/toast";
import { Uploader } from "@/components/admin/uploader";
import { FormFooter, PhotoField, StatusField, TitleSlugFields, useSlug, type Status } from "@/components/admin/hub-form-bits";
import type { Tables } from "@/lib/database.types";

type Book = Tables<"hub_books">;

export function BookForm({ item }: { item?: Book }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [checking, startCheck] = useTransition();
  const [preparing, setPreparing] = useState<string | null>(null);
  const s = useSlug(item?.title ?? "", item?.slug ?? "", Boolean(item));
  const [author, setAuthor] = useState(item?.author ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [cover, setCover] = useState<string | null>(item?.cover_key ?? null);
  const [file, setFile] = useState<{ key: string; name: string; size: number | null } | null>(
    item?.file_key ? { key: item.file_key, name: item.file_name ?? "book.pdf", size: item.file_size ?? null } : null,
  );
  const [status, setStatus] = useState<Status>(item?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await saveBook(item?.id ?? null, {
        title: s.title,
        slug: s.slug,
        author,
        description,
        cover_key: cover,
        file_key: file?.key ?? null,
        file_name: file?.name ?? null,
        file_size: file?.size ?? null,
        status,
      });
      if (!r.ok) {
        setError(r.error);
        return void notify.error("Not saved", { description: r.error });
      }
      notify.success(item ? "Book saved" : "Book created", { description: file ? "Pages are prepared the first time someone opens them." : undefined });
      if (!item && r.data) router.push(`/admin/books/${r.data.id}`);
    });

  const prepare = async (id: string) => {
    setPreparing("Starting…");
    let from: number | null = 1;
    while (from) {
      const r = await prepareBookPages(id, from);
      if (!r.ok) {
        setPreparing(null);
        return void notify.error("Pages not prepared", { description: r.error });
      }
      from = r.data!.next;
      setPreparing(from ? `Page ${from} of ${r.data!.pageCount}…` : null);
    }
    notify.success("All pages are ready", { description: "Readers will not wait for any page." });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
      noValidate
    >
      <div className="space-y-5">
        <TitleSlugFields s={s} base="/read" />
        <Field label="Author" htmlFor="author" optional>
          <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={160} />
        </Field>
        <Field label="Description" htmlFor="description" optional hint="What the book covers, in plain words.">
          <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        </Field>
        <Uploader
          kind="document"
          scope="books"
          label="PDF"
          hint="Up to 200 MB. Each page becomes an image the first time it is read. Use Prepare pages after saving so nobody waits."
          current={file}
          onUploaded={(u) => setFile({ key: u.key, name: u.name, size: u.size })}
          onClear={() => setFile(null)}
        />
        {item?.file_key ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-line p-4">
            <p className="flex-1 text-[14px] text-body">
              {item.page_count ? (
                <>
                  <span className="font-semibold text-ink">{item.page_count} pages</span> · page shape {item.page_aspect ? Number(item.page_aspect).toFixed(2) : "unknown"}
                </>
              ) : (
                <span className="text-danger">The PDF has not been read yet. Agents see a download link until it is.</span>
              )}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={checking}
              onClick={() =>
                startCheck(async () => {
                  const r = await inspectBookAction(item.id);
                  if (!r.ok) return void notify.error("Could not read the PDF", { description: r.error });
                  notify.success(`${r.data!.pageCount} pages found`);
                  router.refresh();
                })
              }
            >
              <RefreshCw aria-hidden /> Re-check PDF
            </Button>
            {item.page_count ? (
              <Button type="button" variant="secondary" size="sm" loading={preparing !== null} onClick={() => void prepare(item.id)}>
                <BookOpenCheck aria-hidden /> {preparing ?? "Prepare pages"}
              </Button>
            ) : null}
          </div>
        ) : null}
        <StatusField value={status} onChange={setStatus} />
        <FormFooter
          pending={pending}
          saveLabel={item ? "Save book" : "Create book"}
          error={error}
          onDelete={item ? () => deleteBook(item.id) : undefined}
          deleteTitle={item ? `Delete “${item.title}”?` : undefined}
          deleteBody="The PDF and cover are removed from storage too."
          afterDelete="/admin/books"
        />
      </div>
      <PhotoField value={cover} onChange={setCover} scope="books" label="Cover" hint="Portrait JPG or WebP, at least 900 px tall." slotLabel="Book cover" ratio="3/4" />
    </form>
  );
}
