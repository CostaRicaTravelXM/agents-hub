import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { HubAdminList } from "@/components/admin/hub-admin-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "FAM Trips" };

export default async function AdminFamTripsPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.from("hub_fam_trips").select("*").order("sort_order").order("created_at");
  const rows = (data ?? []).map((m) => ({
    id: m.id,
    href: `/admin/fam-trips/${m.id}`,
    title: m.title,
    subtitle: [m.timing_label, `${m.nights} nights`, m.regions.join(", ")].filter(Boolean).join(" · "),
    status: m.status,
    imageKey: m.image_key,
    note: !m.cta_url ? "No form link" : null,
    portrait: false,
  }));
  return (
    <>
      <AdminHeader
        title="FAM Trips"
        description="The departures agents can register interest in. Drag to change the order."
        actions={
          <Button asChild>
            <Link href="/admin/fam-trips/new">
              <Plus aria-hidden /> New FAM trip
            </Link>
          </Button>
        }
      />
      <HubAdminList table="hub_fam_trips" rows={rows} newHref="/admin/fam-trips/new" newLabel="New FAM trip" emptyTitle="No FAM trips yet" emptyBody="Add the first departure." />
    </>
  );
}
