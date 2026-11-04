import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <div className="xm-reveal">
      <h1 className="xm-title-sm">Create your account</h1>
      <p className="mt-3 mb-7 text-[17px] text-muted">Free for travel advisors who sell Costa Rica. It takes about a minute.</p>
      <RegisterForm next={next} google={env.googleAuth} />
      <p className="mt-7 text-[15px] text-body">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="xm-link font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  );
}
