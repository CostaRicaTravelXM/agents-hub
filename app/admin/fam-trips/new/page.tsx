import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/ui";
import { FamTripForm } from "@/components/admin/fam-trip-form";

export const metadata: Metadata = { title: "New FAM trip" };

export default async function NewFamTripsPage() {
  await requireStaff();
  return (
    <>
      <AdminHeader back={{ href: "/admin/fam-trips", label: "FAM Trips" }} title="New FAM trip" description="It starts as a draft so you can add the photo and details first." />
      <div className="rounded-lg bg-card p-5 shadow-card md:p-8">
        <FamTripForm />
      </div>
    </>
  );
}
