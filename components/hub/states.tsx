"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/surface";

/** Skeleton for a module list page: a title and a grid of cards. */
export function ModuleLoading({ cards = 3, ratio = "16/10" }: { cards?: number; ratio?: "16/9" | "16/10" | "3/4" }) {
  const shape = ratio === "3/4" ? "aspect-[3/4]" : ratio === "16/9" ? "aspect-video" : "aspect-[16/10]";
  return (
    <div className="xm-container pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <Skeleton className="mt-4 h-5 w-full max-w-xl" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i}>
            <Skeleton className={`${shape} rounded-lg`} />
            <div className="space-y-3 px-1 pt-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Plain-words error for a module route (`error.tsx`). */
export function ModuleError({ title, reset, home = "/dashboard" }: { title: string; reset: () => void; home?: string }) {
  return (
    <div className="xm-container pt-10 md:pt-16">
      <div className="mx-auto max-w-lg rounded-lg bg-card p-8 text-center shadow-card">
        <span className="mx-auto grid size-14 place-items-center rounded-pill bg-sunken text-danger">
          <CircleAlert aria-hidden className="size-6 stroke-[1.75]" />
        </span>
        <h1 className="xm-subtitle-sm mt-5">{title}</h1>
        <p className="mt-3 text-[16px] text-muted">Something went wrong on our side. Trying again usually fixes it.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={home}>Go to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
