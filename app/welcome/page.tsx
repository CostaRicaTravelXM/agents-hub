import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { NameForm } from "@/components/auth-forms";
import { BrandLink, Cutout } from "@/components/brand";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Create your account" };

/** Only for sign-ins that did not give us a full name (Google, email link). */
export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const viewer = await requireViewer("/welcome");
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  if (viewer.profile.first_name && viewer.profile.last_name) redirect(next);
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <header className="xm-container flex h-24 items-center">
        <BrandLink />
      </header>
      <main className="xm-container max-w-[560px] pt-6 pb-20">
        <h1 className="xm-title">What&rsquo;s your name?</h1>
        <p className="xm-lead mt-4 text-muted">
          We only need this to create your TravelXM account. It&rsquo;s also the name on your certificates, so type it the way you want it to appear.
        </p>
        <div className="mt-10 rounded-lg bg-card p-6 shadow-card md:p-8">
          <NameForm firstName={viewer.profile.first_name} lastName={viewer.profile.last_name} next={next} />
        </div>
      </main>
      <Cutout name="macaw" width={96} height={396} className="top-10 -right-4 hidden lg:block" />
    </div>
  );
}
