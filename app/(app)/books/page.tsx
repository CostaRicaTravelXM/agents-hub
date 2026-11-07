import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { listBooks } from "@/lib/hub/queries";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { MediaCard } from "@/components/hub/media-card";
import { EmptyState } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Books" };

export default async function BooksPage() {
  const viewer = await requireViewer();
  const books = await listBooks(viewer.id);
  return (
    <Page>
      <PageHeader title="Books" lead="Guides from TravelXM to read page by page, on your phone or your computer. Your place is saved." />
      {books.length ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
          {books.map((b, i) => (
            <li key={b.id}>
              <MediaCard
                href={`/read/${b.slug}`}
                title={b.title}
                imageKey={b.cover_key}
                imageLabel="Book cover"
                ratio="3/4"
                priority={i < 4}
                viewTransitionName={`book-${b.id}`}
                sizes="(min-width: 1280px) 280px, (min-width: 768px) 30vw, 50vw"
                meta={[b.author, b.page_count ? `${b.page_count} pages` : null].filter(Boolean).join(", ") || undefined}
                footer={b.lastPage && b.lastPage > 1 ? `Continue at page ${b.lastPage}` : "Open book"}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<BookOpen aria-hidden />} title="No books yet" body="Books appear here as soon as TravelXM publishes them." />
      )}
    </Page>
  );
}
