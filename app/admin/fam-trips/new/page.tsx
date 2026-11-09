import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { FamTripForm } from "@/components/admin/fam-trip-form";

export const metadata: Metadata = { title: "New FAM trip" };

export default async function NewFamTripsPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data: groups } = await supabase.from("groups").select("id, name, group_members(user_id)").order("name");
  return (
    <>
      <AdminHeader back={{ href: "/admin/fam-trips", label: "FAM Trips" }} title="New FAM trip" description="It starts as a draft so you can add the photo and details first." />
      <div className="rounded-lg bg-card p-5 shadow-card md:p-8">
        <FamTripForm groups={(groups ?? []).map((g) => ({ id: g.id, name: g.name, members: g.group_members.length }))} />
      </div>
    </>
  );
}
