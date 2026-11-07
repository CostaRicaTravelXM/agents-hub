import type { Metadata } from "next";
import Link from "next/link";
import { CircleX, Users } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { createAnonClient } from "@/lib/supabase/server";
import { BrandLink } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { JoinNow } from "@/components/join-now";

export const metadata: Metadata = { title: "Join a group", robots: { index: false } };

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const [viewer, { data }] = await Promise.all([getViewer(), createAnonClient().rpc("peek_group", { p_code: code })]);
  const group = data?.[0];
  const here = `/join/${encodeURIComponent(code)}`;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="xm-container flex h-24 items-center">
        <BrandLink />
      </header>
      <main className="xm-container flex flex-1 items-start justify-center pt-6 pb-16 md:items-center md:pt-0">
        <div className="xm-reveal w-full max-w-lg rounded-lg bg-card p-8 shadow-raised md:p-10">
          {group ? (
            <>
              <span className="grid size-14 place-items-center rounded-pill bg-toucan text-black">
                <Users aria-hidden className="size-6 stroke-[1.75]" />
              </span>
              <h1 className="xm-title-sm mt-6">You are invited to {group.name}</h1>
              {group.description ? <p className="mt-3 text-[17px] text-body">{group.description}</p> : null}
              <p className="mt-3 text-[15px] text-muted">Members get access to courses that are only available to this group.</p>
              <div className="mt-8">
                {viewer ? (
                  <JoinNow code={code} />
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg">
                      <Link href={`/register?next=${encodeURIComponent(here)}`}>Create an account</Link>
                    </Button>
                    <Button asChild size="lg" variant="secondary">
                      <Link href={`/login?next=${encodeURIComponent(here)}`}>I already have one</Link>
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="grid size-14 place-items-center rounded-pill bg-danger text-white">
                <CircleX aria-hidden className="size-6 stroke-[1.75]" />
              </span>
              <h1 className="xm-title-sm mt-6">This invite is not valid</h1>
              <p className="mt-3 text-[17px] text-body">
                The code may have a typo, or the group has closed new sign-ups. Ask your TravelXM contact for a new link.
              </p>
              <Button asChild className="mt-6">
                <Link href={viewer ? "/dashboard" : "/"}>Go to the Agents Hub</Link>
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
