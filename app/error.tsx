"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="xm-container flex min-h-[70dvh] flex-col justify-center py-16">
      <h1 className="xm-title max-w-2xl">Something went wrong loading this page</h1>
      <p className="xm-lead mt-4 max-w-xl text-muted">
        Your progress is saved. Try again, and if it keeps happening, contact the TravelXM team
        {error.digest ? ` with reference ${error.digest}` : ""}.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={reset}>
          <RotateCcw aria-hidden /> Try again
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
