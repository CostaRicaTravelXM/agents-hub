import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { LinksEditor } from "@/components/admin/links-editor";

export const metadata: Metadata = { title: "Links" };

export default async function AdminLinksPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.from("hub_links").select("*").order("group_key").order("sort_order").order("created_at");
  return (
    <>
      <AdminHeader title="Links" description="Folders and pages outside the Hub, such as the marketing assets in Google Drive." />
      <LinksEditor links={data ?? []} />
    </>
  );
}
