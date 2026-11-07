"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";
import { ResourceList } from "@/components/learning/resource-list";
import { EmptyState } from "@/components/ui/surface";
import type { Tables } from "@/lib/database.types";

type Item = Pick<Tables<"resources">, "id" | "title" | "description" | "file_key" | "file_size" | "file_mime" | "external_url">;

export function ResourceLibrary({ groups }: { groups: { title: string; slug: string; items: Item[] }[] }) {
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const filtered = groups
    .map((g) => ({
      ...g,
      items: q ? g.items.filter((i) => [i.title, i.description, g.title].some((t) => t?.toLowerCase().includes(q))) : g.items,
    }))
    .filter((g) => g.items.length);

  return (
    <div>
      <label className="relative block max-w-md">
        <span className="sr-only">Search resources</span>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 stroke-[1.75] text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fact sheets, handbooks…"
          className="h-12 w-full rounded-pill border border-control bg-card pr-4 pl-11 text-[16px] text-ink placeholder:text-muted transition-colors duration-120 focus-visible:border-ink focus-visible:outline-none"
        />
      </label>

      {filtered.length ? (
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filtered.map((g) => (
            <section key={g.slug} aria-labelledby={`res-${g.slug}`} className="rounded-lg bg-card p-5 shadow-card md:p-6">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <h2 id={`res-${g.slug}`} className="font-ui text-[17px] font-semibold text-ink">
                  {g.title}
                </h2>
                <Link href={`/courses/${g.slug}`} className="xm-link shrink-0 font-ui text-[15px] font-semibold">
                  Course
                </Link>
              </div>
              <ResourceList resources={g.items} />
            </section>
          ))}
        </div>
      ) : (
        <EmptyState className="mt-8" icon={<Search aria-hidden />} title="No resources match" body="Try a different word." />
      )}
    </div>
  );
}
