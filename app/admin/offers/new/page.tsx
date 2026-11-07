import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/ui";
import { OfferForm } from "@/components/admin/offer-form";

export const metadata: Metadata = { title: "New offer" };

export default async function NewOffersPage() {
  await requireStaff();
  return (
    <>
      <AdminHeader back={{ href: "/admin/offers", label: "Current Offers" }} title="New offer" description="Add the dates, a photo and the PDF or link, then publish." />
      <div className="rounded-lg bg-card p-5 shadow-card md:p-8">
        <OfferForm />
      </div>
    </>
  );
}
