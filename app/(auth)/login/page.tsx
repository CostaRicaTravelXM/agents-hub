import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  return (
    <div className="xm-reveal">
      <h1 className="xm-title-sm">Welcome back</h1>
      <p className="mt-3 mb-7 text-[17px] text-muted">Sign in with the email you used to create your Academy account.</p>
      {error ? (
        <p role="alert" className="mb-5 rounded-md bg-card p-4 text-[15px] text-ink shadow-card">
          {error === "link"
            ? "That email link has expired or was already used. Sign in with your password, or ask for a new link."
            : "Sign-in did not finish. Please try again."}
        </p>
      ) : null}
      <LoginForm next={next} google={env.googleAuth} />
      <p className="mt-7 text-[15px] text-body">
        New to the Academy?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="xm-link font-semibold">
          Create a free account
        </Link>
      </p>
    </div>
  );
}
