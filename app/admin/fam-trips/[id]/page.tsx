import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { FamTripForm } from "@/components/admin/fam-trip-form";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Edit trip" };

const tone = { published: "success", draft: "warning", archived: "muted" } as const;

export default async function EditFamTripsPage({ params }: PageProps<"/admin/fam-trips/[id]">) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: item }, { data: groups }, { data: picked }] = await Promise.all([
    supabase.from("hub_fam_trips").select("*").eq("id", id).maybeSingle(),
    supabase.from("groups").select("id, name, group_members(user_id)").order("name"),
    supabase.from("hub_fam_trip_groups").select("group_id").eq("fam_trip_id", id),
  ]);
  if (!item) notFound();
  return (
    <>
      <AdminHeader
        back={{ href: "/admin/fam-trips", label: "FAM Trips" }}
        title={item.title}
        description={
          <span className="inline-flex items-center gap-2 capitalize">
            <StatusDot tone={tone[item.status]} /> {item.status}
          </span>
        }
        actions={
          item.status === "published" ? (
            <Button asChild variant="secondary">
              <Link href={`/fam-trips/${item.slug}`} target="_blank">
                <Eye aria-hidden /> View as agent
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="rounded-lg bg-card p-5 shadow-card md:p-8">
        <FamTripForm
          item={item}
          groups={(groups ?? []).map((g) => ({ id: g.id, name: g.name, members: g.group_members.length }))}
          groupIds={(picked ?? []).map((p) => p.group_id)}
        />
      </div>
    </>
  );
}
