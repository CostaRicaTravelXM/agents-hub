import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="xm-reveal">
      <h1 className="xm-title-sm">Forgot your password?</h1>
      <p className="mt-3 mb-7 text-[17px] text-muted">
        No problem. Type the email you signed up with and we will send you a link to choose a new one.
      </p>
      <ForgotForm />
      <p className="mt-7 text-[15px]">
        <Link href="/login" className="xm-link font-semibold">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
