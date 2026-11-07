import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ForgotForm, ResetForm, SendMyResetLink, SentNotice } from "@/components/auth-forms";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { hasRecoveryGrant } from "@/lib/recovery";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

/**
 * Reached from the emailed reset link (through /auth/confirm, which signs the
 * agent in and grants a 15-minute window). Without that grant the page only
 * offers to send a new link.
 */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const [viewer, sp] = await Promise.all([getViewer(), searchParams]);
  const expired = sp.expired === "1";
  const allowed = viewer ? await hasRecoveryGrant(viewer.id) : false;

  if (sp.done === "1") {
    return (
      <div className="xm-reveal space-y-5">
        <SentNotice
          icon={<ShieldCheck className="size-5 stroke-[1.75]" aria-hidden />}
          title="Password changed"
          message="Use your new password the next time you sign in. Any other device signed in to your account has been signed out."
        />
        <Button asChild block size="lg">
          <Link href={viewer ? "/dashboard" : "/login"}>{viewer ? "Go to my dashboard" : "Sign in"}</Link>
        </Button>
      </div>
    );
  }

  if (viewer && allowed) {
    return (
      <div className="xm-reveal">
        <h1 className="xm-title">Choose a new password</h1>
        <p className="mt-3 mb-7 text-[17px] text-muted">
          For <span className="font-semibold text-ink">{viewer.email}</span>. Use at least 8 characters.
        </p>
        <ResetForm />
      </div>
    );
  }

  return (
    <div className="xm-reveal">
      <h1 className="xm-title">{expired ? "This link has expired" : "Change your password"}</h1>
      <p className="mt-3 mb-7 text-[17px] text-muted">
        {expired
          ? "Reset links work once, for one hour. Ask for a new one below and open the newest email."
          : "For your security, you can only change your password from the link we email you."}
      </p>
      {viewer ? <SendMyResetLink email={viewer.email} /> : <ForgotForm />}
      <p className="mt-7 text-[15px]">
        <Link href={viewer ? "/profile" : "/login"} className="xm-link font-semibold">
          {viewer ? "Back to my profile" : "Back to sign in"}
        </Link>
      </p>
    </div>
  );
}
