import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { HubAdminList } from "@/components/admin/hub-admin-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Books" };

export default async function AdminBooksPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.from("hub_books").select("*").order("sort_order").order("created_at");
  const rows = (data ?? []).map((m) => ({
    id: m.id,
    href: `/admin/books/${m.id}`,
    title: m.title,
    subtitle: [m.author, m.page_count ? `${m.page_count} pages` : null].filter(Boolean).join(" · "),
    status: m.status,
    imageKey: m.cover_key,
    note: m.file_key && !m.page_count ? "PDF not read" : !m.file_key ? "No PDF" : null,
    portrait: true,
  }));
  return (
    <>
      <AdminHeader
        title="Books"
        description="PDF guides agents read page by page. Upload the PDF and a portrait cover."
        actions={
          <Button asChild>
            <Link href="/admin/books/new">
              <Plus aria-hidden /> New book
            </Link>
          </Button>
        }
      />
      <HubAdminList table="hub_books" rows={rows} newHref="/admin/books/new" newLabel="New book" emptyTitle="No books yet" emptyBody="Upload the first PDF." />
    </>
  );
}
