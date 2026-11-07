"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, nullableText, staffClient, uuid, type Result } from "@/lib/actions";
import { deleteObject } from "@/lib/storage";
import { PAGE_WIDTHS, inspectBook, renderBookPage } from "@/lib/hub/books-render";
import { slugify } from "@/lib/utils";
import type { Json } from "@/lib/database.types";

/* ---------- shared fields ---------- */
const status = z.enum(["draft", "published", "archived"]);
const slugField = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((v) => v ?? "");
const mediaKey = z.string().max(500).nullable().optional();
const blankToNull = z.literal("").transform(() => null);
const httpsUrl = z
  .string()
  .trim()
  .url("Enter a full link starting with https://")
  .refine((u) => u.startsWith("https://"), "Only https links are allowed")
  .nullable()
  .optional()
  .or(blankToNull);
const httpUrl = z
  .string()
  .trim()
  .url("Enter a full link starting with https://")
  .refine((u) => /^https?:\/\//.test(u), "Only http and https links are allowed")
  .nullable()
  .optional()
  .or(blankToNull);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
  .nullable()
  .optional()
  .or(blankToNull);

type Id = { id: string };

/* ================================================================ FAM trips */
const famSegment = z.enum(["classic", "luxury", "romance", "wellness", "adventure", "family", "groups", "business"]);
const famTripSchema = z.object({
  title: z.string().trim().min(3, "Give the trip a title").max(160),
  slug: slugField,
  timing_label: z.string().trim().min(2, "When does it run? For example “Nov 2026”").max(40),
  starts_on: isoDate,
  nights: z.coerce.number().int().min(1, "At least one night").max(30),
  regions: z.array(z.string().trim().min(1).max(60)).max(10),
  segments: z.array(famSegment).max(8),
  summary: z.string().trim().min(10, "Write a one-line summary").max(600),
  expect: nullableText(1000),
  body: z.any().optional(),
  image_key: mediaKey,
  image_alt: nullableText(200),
  cta_url: httpsUrl,
  cta_label: z.string().trim().min(2).max(40).optional().transform((v) => v || "Register interest"),
  status,
});

export async function saveFamTrip(id: string | null, input: z.input<typeof famTripSchema>): Promise<Result<Id>> {
  try {
    const { supabase } = await staffClient();
    const v = famTripSchema.parse(input);
    const row = { ...v, slug: slugify(v.slug || v.title), body: (v.body ?? null) as Json };
    if (id) {
      const { data: before } = await supabase.from("hub_fam_trips").select("image_key").eq("id", uuid.parse(id)).single();
      const { error } = await supabase.from("hub_fam_trips").update(row).eq("id", id);
      if (error) throw error;
      if (before?.image_key && before.image_key !== v.image_key) await deleteObject("public", before.image_key);
      refresh();
      return { ok: true, data: { id } };
    }
    const { data: last } = await supabase.from("hub_fam_trips").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase
      .from("hub_fam_trips")
      .insert({ ...row, sort_order: (last?.sort_order ?? -1) + 1 })
      .select("id")
      .single();
    if (error) throw error;
    refresh();
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteFamTrip(id: string): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const { data: t } = await supabase.from("hub_fam_trips").select("image_key").eq("id", uuid.parse(id)).single();
    const { error } = await supabase.from("hub_fam_trips").delete().eq("id", id);
    if (error) throw error;
    await deleteObject("public", t?.image_key);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ================================================================ offers */
const offerSchema = z
  .object({
    title: z.string().trim().min(3, "Give the offer a title").max(160),
    slug: slugField,
    excerpt: nullableText(300),
    body: z.any().optional(),
    image_key: mediaKey,
    valid_from: isoDate,
    valid_until: isoDate,
    file_key: mediaKey,
    file_name: z.string().max(260).nullable().optional(),
    file_size: z.number().int().nonnegative().nullable().optional(),
    link_url: httpUrl,
    cta_url: httpsUrl,
    cta_label: nullableText(40),
    status,
  })
  .refine((v) => !v.valid_from || !v.valid_until || v.valid_from <= v.valid_until, {
    message: "The offer cannot end before it starts",
    path: ["valid_until"],
  });

export async function saveOffer(id: string | null, input: z.input<typeof offerSchema>): Promise<Result<Id>> {
  try {
    const { supabase } = await staffClient();
    const v = offerSchema.parse(input);
    const row = { ...v, slug: slugify(v.slug || v.title), body: (v.body ?? null) as Json };
    if (id) {
      const { data: before } = await supabase.from("hub_offers").select("image_key, file_key").eq("id", uuid.parse(id)).single();
      const { error } = await supabase.from("hub_offers").update(row).eq("id", id);
      if (error) throw error;
      if (before?.image_key && before.image_key !== v.image_key) await deleteObject("public", before.image_key);
      if (before?.file_key && before.file_key !== v.file_key) await deleteObject("private", before.file_key);
      refresh();
      return { ok: true, data: { id } };
    }
    const { data: last } = await supabase.from("hub_offers").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase
      .from("hub_offers")
      .insert({ ...row, sort_order: (last?.sort_order ?? -1) + 1 })
      .select("id")
      .single();
    if (error) throw error;
    refresh();
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteOffer(id: string): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const { data: o } = await supabase.from("hub_offers").select("image_key, file_key").eq("id", uuid.parse(id)).single();
    const { error } = await supabase.from("hub_offers").delete().eq("id", id);
    if (error) throw error;
    await Promise.all([deleteObject("public", o?.image_key), deleteObject("private", o?.file_key)]);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ================================================================ books */
const bookSchema = z.object({
  title: z.string().trim().min(2, "Give the book a title").max(160),
  slug: slugField,
  author: nullableText(160),
  description: nullableText(2000),
  cover_key: mediaKey,
  file_key: mediaKey,
  file_name: z.string().max(260).nullable().optional(),
  file_size: z.number().int().nonnegative().nullable().optional(),
  status,
});

async function refreshBookMeta(supabase: Awaited<ReturnType<typeof staffClient>>["supabase"], id: string) {
  const { data: book } = await supabase.from("hub_books").select("id, file_key, file_version").eq("id", id).single();
  if (!book?.file_key) return { ok: false as const, error: "This book has no PDF yet." };
  try {
    const meta = await inspectBook(book);
    if (!meta) return { ok: false as const, error: "The PDF could not be read from storage." };
    const { error } = await supabase.from("hub_books").update({ page_count: meta.pageCount, page_aspect: meta.pageAspect }).eq("id", id);
    if (error) throw error;
    return { ok: true as const, data: meta };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "The PDF could not be opened." };
  }
}

export async function saveBook(id: string | null, input: z.input<typeof bookSchema>): Promise<Result<Id>> {
  try {
    const { supabase } = await staffClient();
    const v = bookSchema.parse(input);
    if (v.status === "published" && !v.file_key) return { ok: false, error: "Upload the PDF before publishing." };
    const row = { ...v, slug: slugify(v.slug || v.title) };
    let bookId = id;
    let fileChanged = Boolean(v.file_key);
    if (id) {
      const { data: before } = await supabase.from("hub_books").select("cover_key, file_key, file_version").eq("id", uuid.parse(id)).single();
      fileChanged = before?.file_key !== v.file_key;
      const { error } = await supabase
        .from("hub_books")
        .update(fileChanged ? { ...row, file_version: (before?.file_version ?? 0) + 1, page_count: null, page_aspect: null } : row)
        .eq("id", id);
      if (error) throw error;
      if (before?.cover_key && before.cover_key !== v.cover_key) await deleteObject("public", before.cover_key);
      if (before?.file_key && before.file_key !== v.file_key) await deleteObject("private", before.file_key);
    } else {
      const { data: last } = await supabase.from("hub_books").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await supabase
        .from("hub_books")
        .insert({ ...row, sort_order: (last?.sort_order ?? -1) + 1 })
        .select("id")
        .single();
      if (error) throw error;
      bookId = data.id;
    }
    // Page count and shape come from the PDF itself; best effort, the reader copes without them.
    if (fileChanged && v.file_key && bookId) await refreshBookMeta(supabase, bookId);
    refresh();
    return { ok: true, data: { id: bookId! } };
  } catch (e) {
    return fail(e);
  }
}

export async function inspectBookAction(id: string): Promise<Result<{ pageCount: number; pageAspect: number }>> {
  try {
    const { supabase } = await staffClient();
    const r = await refreshBookMeta(supabase, uuid.parse(id));
    if (r.ok) refresh();
    return r;
  } catch (e) {
    return fail(e);
  }
}

/**
 * Renders a few pages ahead of time so the first reader does not wait. The admin
 * form calls this repeatedly with the next page until it returns null: each call
 * stays well inside the time limit of a server function, however long the book is.
 */
export async function prepareBookPages(id: string, from: number): Promise<Result<{ next: number | null; pageCount: number }>> {
  try {
    const { supabase } = await staffClient();
    const { data: book } = await supabase.from("hub_books").select("id, file_key, file_version, page_count").eq("id", uuid.parse(id)).single();
    if (!book?.file_key || !book.page_count) return { ok: false, error: "Read the PDF first." };
    const last = Math.min(book.page_count, from + 3);
    for (let page = from; page <= last; page++) {
      for (const width of PAGE_WIDTHS) await renderBookPage(book, page, width);
    }
    return { ok: true, data: { next: last < book.page_count ? last + 1 : null, pageCount: book.page_count } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBook(id: string): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const { data: b } = await supabase.from("hub_books").select("cover_key, file_key").eq("id", uuid.parse(id)).single();
    const { error } = await supabase.from("hub_books").delete().eq("id", id);
    if (error) throw error;
    await Promise.all([deleteObject("public", b?.cover_key), deleteObject("private", b?.file_key)]);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ================================================================ links */
const linkSchema = z.object({
  group_key: z.enum(["marketing", "home"]),
  title: z.string().trim().min(2, "Name the link").max(120),
  description: nullableText(300),
  url: z
    .string()
    .trim()
    .url("Enter a full link starting with https://")
    .refine((u) => /^https?:\/\//.test(u), "Only http and https links are allowed"),
});

export async function saveLink(id: string | null, input: z.input<typeof linkSchema>): Promise<Result<Id>> {
  try {
    const { supabase } = await staffClient();
    const v = linkSchema.parse(input);
    if (id) {
      const { error } = await supabase.from("hub_links").update(v).eq("id", uuid.parse(id));
      if (error) throw error;
      refresh();
      return { ok: true, data: { id } };
    }
    const { data: last } = await supabase.from("hub_links").select("sort_order").eq("group_key", v.group_key).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase
      .from("hub_links")
      .insert({ ...v, sort_order: (last?.sort_order ?? -1) + 1 })
      .select("id")
      .single();
    if (error) throw error;
    refresh();
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLink(id: string): Promise<Result> {
  try {
    const { supabase } = await staffClient();
    const { error } = await supabase.from("hub_links").delete().eq("id", uuid.parse(id));
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
