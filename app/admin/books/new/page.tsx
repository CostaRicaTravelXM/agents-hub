import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/ui";
import { BookForm } from "@/components/admin/book-form";

export const metadata: Metadata = { title: "New book" };

export default async function NewBooksPage() {
  await requireStaff();
  return (
    <>
      <AdminHeader back={{ href: "/admin/books", label: "Books" }} title="New book" description="Upload the PDF; pages are prepared automatically." />
      <div className="rounded-lg bg-card p-5 shadow-card md:p-8">
        <BookForm />
      </div>
    </>
  );
}
