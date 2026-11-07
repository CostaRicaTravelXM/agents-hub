import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { HubAdminList } from "@/components/admin/hub-admin-list";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Current Offers" };

export default async function AdminOffersPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.from("hub_offers").select("*").order("sort_order").order("created_at");
  const rows = (data ?? []).map((m) => ({
    id: m.id,
    href: `/admin/offers/${m.id}`,
    title: m.title,
    subtitle: [m.valid_from ? `From ${formatDate(m.valid_from)}` : null, m.valid_until ? `Until ${formatDate(m.valid_until)}` : null].filter(Boolean).join(" · ") || "No dates",
    status: m.status,
    imageKey: m.image_key,
    note: m.valid_until && m.valid_until < new Date().toISOString().slice(0, 10) ? "Expired" : null,
    portrait: false,
  }));
  return (
    <>
      <AdminHeader
        title="Current Offers"
        description="Promotions with a start and end date. Expired offers disappear for agents on their own."
        actions={
          <Button asChild>
            <Link href="/admin/offers/new">
              <Plus aria-hidden /> New offer
            </Link>
          </Button>
        }
      />
      <HubAdminList table="hub_offers" rows={rows} newHref="/admin/offers/new" newLabel="New offer" emptyTitle="No offers yet" emptyBody="Create the first promotion." />
    </>
  );
}
