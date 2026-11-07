import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import { needsWelcome, requireViewer } from "@/lib/auth";
import { getBook, getBookProgress } from "@/lib/hub/queries";
import { DEFAULT_PAGE_ASPECT } from "@/lib/books";
import { BookReader } from "@/components/books/reader/book-reader";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: PageProps<"/read/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBook(slug);
  return { title: book ? book.title : "Book" };
}

/** Full-screen reader, outside the app shell so the whole phone screen is the page. */
export default async function ReadPage({ params }: PageProps<"/read/[slug]">) {
  const { slug } = await params;
  const viewer = await requireViewer(`/read/${slug}`);
  if (needsWelcome(viewer.profile)) redirect(`/welcome?next=${encodeURIComponent(`/read/${slug}`)}`);
  const book = await getBook(slug);
  if (!book) notFound();
  const saved = await getBookProgress(viewer.id, book.id);

  if (!book.page_count) {
    return (
      <main className="xm-container flex min-h-dvh flex-col items-start justify-center py-16">
        <Link href="/books" className="inline-flex h-11 items-center gap-1 rounded-md px-2 font-ui text-[15px] font-semibold text-link hover:text-link-hover">
          <ChevronLeft aria-hidden className="size-5 stroke-[2]" /> Books
        </Link>
        <h1 className="xm-title mt-6">{book.title}</h1>
        <p className="xm-lead mt-4 max-w-lg text-muted">This book is still being prepared for reading in the Hub. You can download the PDF meanwhile.</p>
        <Button asChild size="lg" className="mt-8">
          <a href={`/api/hub/books/${book.id}?mode=download`}>
            <Download aria-hidden /> Download the PDF
          </a>
        </Button>
      </main>
    );
  }

  return (
    <>
      <BookReader
        book={{
          id: book.id,
          slug: book.slug,
          title: book.title,
          pageCount: book.page_count,
          pageAspect: Number(book.page_aspect ?? DEFAULT_PAGE_ASPECT),
          fileVersion: book.file_version,
        }}
        startPage={saved ?? 1}
      />
      <noscript>
        <p className="p-6 text-center">
          <a href={`/api/hub/books/${book.id}`}>Open the PDF</a>
        </p>
      </noscript>
    </>
  );
}
