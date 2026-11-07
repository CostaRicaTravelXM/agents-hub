import "server-only";
import { getObjectBytes, putObject } from "@/lib/storage";
import type { Book } from "@/lib/hub/queries";

/**
 * Books are PDFs in the private bucket. The reader never loads pdf.js: each
 * page is rendered here once, stored next to the PDF as WebP, and served as a
 * plain image. Lighter on old phones and iPads, and no cross-origin fetches.
 */
export const PAGE_WIDTHS = [800, 1600] as const;
export type PageWidth = (typeof PAGE_WIDTHS)[number];

/** PDF points are 72 per inch; a Letter page is 612 wide. The scale targets the requested width with some headroom. */
function scaleFor(width: number) {
  return Math.min(4, Math.max(0.5, (width * 1.05) / 612));
}

// The whole PDF stays in memory for a few minutes while a reader turns pages,
// so neighbouring pages do not download it again.
const pdfCache = new Map<string, { bytes: Uint8Array; expires: number }>();
const PDF_TTL_MS = 5 * 60_000;
const PDF_CACHE_MAX = 3;

async function loadPdf(book: Pick<Book, "id" | "file_key" | "file_version">): Promise<Uint8Array | null> {
  if (!book.file_key) return null;
  const cacheKey = `${book.id}:${book.file_version}`;
  const hit = pdfCache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.bytes;
  const bytes = await getObjectBytes("private", book.file_key);
  if (!bytes) return null;
  if (pdfCache.size >= PDF_CACHE_MAX) {
    const oldest = [...pdfCache.entries()].sort((a, b) => a[1].expires - b[1].expires)[0];
    if (oldest) pdfCache.delete(oldest[0]);
  }
  pdfCache.set(cacheKey, { bytes, expires: Date.now() + PDF_TTL_MS });
  return bytes;
}

export function pageImageKey(book: Pick<Book, "id" | "file_version">, page: number, width: PageWidth) {
  return `books/${book.id}/v${book.file_version}/${page}-${width}.webp`;
}

/** Page count and the aspect ratio (width / height) of the first page. */
export async function inspectPdf(bytes: Uint8Array): Promise<{ pageCount: number; pageAspect: number }> {
  const { pdf } = await import("pdf-to-img");
  const sharp = (await import("sharp")).default;
  // pdf.js takes ownership of the buffer and empties it, so it always gets a copy.
  const doc = await pdf(bytes.slice(), { scale: 0.4 });
  try {
    const first = await doc.getPage(1);
    const meta = await sharp(first).metadata();
    const aspect = meta.width && meta.height ? meta.width / meta.height : 0.7727;
    return { pageCount: doc.length, pageAspect: Math.round(aspect * 10000) / 10000 };
  } finally {
    await doc.destroy();
  }
}

export async function inspectBook(book: Pick<Book, "id" | "file_key" | "file_version">) {
  const bytes = await loadPdf(book);
  if (!bytes) return null;
  return inspectPdf(bytes);
}

/**
 * The WebP for one page, rendered on first request and kept in the private
 * bucket for every later reader.
 */
export async function renderBookPage(
  book: Pick<Book, "id" | "file_key" | "file_version" | "page_count">,
  page: number,
  width: PageWidth,
): Promise<Uint8Array | null> {
  const key = pageImageKey(book, page, width);
  const cached = await getObjectBytes("private", key);
  if (cached) return cached;

  const bytes = await loadPdf(book);
  if (!bytes) return null;
  const { pdf } = await import("pdf-to-img");
  const sharp = (await import("sharp")).default;
  const doc = await pdf(bytes.slice(), { scale: scaleFor(width) });
  let webp: Buffer;
  try {
    if (page < 1 || page > doc.length) return null;
    const png = await doc.getPage(page);
    webp = await sharp(png).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } finally {
    await doc.destroy();
  }
  try {
    await putObject("private", key, webp, "image/webp");
  } catch (e) {
    // Serving the page matters more than caching it.
    console.error("renderBookPage cache", e);
  }
  return webp;
}
