import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { CategoriesEditor } from "@/components/admin/categories-editor";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, name, description, is_destination, courses(id)").order("sort_order");
  return (
    <>
      <AdminHeader title="Categories" description="Destinations and topics. Agents filter the catalog by them." />
      <CategoriesEditor categories={(data ?? []).map((c) => ({ ...c, courses: c.courses.length }))} />
    </>
  );
}
