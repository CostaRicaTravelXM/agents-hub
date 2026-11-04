import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { BrandLink, Cutout } from "@/components/brand";
import { ProfileForm } from "@/components/profile-forms";
import { firstName, safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const viewer = await requireViewer("/onboarding");
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  if (viewer.profile.onboarded_at) redirect(next);
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <header className="xm-container flex h-24 items-center">
        <BrandLink />
      </header>
      <main className="xm-container max-w-[720px] pt-6 pb-20">
        <h1 className="xm-title">Hi {firstName(viewer.profile.full_name)}, one more step</h1>
        <p className="xm-lead mt-4 text-muted">
          Tell us where you sell from. Your name appears on your certificates exactly as you type it here.
        </p>
        <div className="mt-10 rounded-lg bg-card p-6 shadow-card md:p-8">
          <ProfileForm profile={viewer.profile} next={next} submitLabel="Continue to the Academy" />
        </div>
      </main>
      <Cutout name="macaw" width={96} height={396} className="top-10 -right-4 hidden lg:block" />
    </div>
  );
}
