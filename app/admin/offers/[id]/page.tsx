import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { OfferForm } from "@/components/admin/offer-form";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Edit offer" };

const tone = { published: "success", draft: "warning", archived: "muted" } as const;

export default async function EditOffersPage({ params }: PageProps<"/admin/offers/[id]">) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: item } = await supabase.from("hub_offers").select("*").eq("id", id).maybeSingle();
  if (!item) notFound();
  return (
    <>
      <AdminHeader
        back={{ href: "/admin/offers", label: "Current Offers" }}
        title={item.title}
        description={
          <span className="inline-flex items-center gap-2 capitalize">
            <StatusDot tone={tone[item.status]} /> {item.status}
          </span>
        }
        actions={
          item.status === "published" ? (
            <Button asChild variant="secondary">
              <Link href={`/offers/${item.slug}`} target="_blank">
                <Eye aria-hidden /> View as agent
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="rounded-lg bg-card p-5 shadow-card md:p-8">
        <OfferForm item={item} />
      </div>
    </>
  );
}
