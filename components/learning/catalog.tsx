"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { GraduationCap, Search, X } from "lucide-react";
import type { CourseSummary } from "@/lib/queries";
import { CourseCard } from "@/components/learning/course-card";
import { EmptyState } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

type Status = "all" | "in_progress" | "not_started" | "completed";
const STATUS: { id: Status; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in_progress", label: "In progress" },
  { id: "not_started", label: "Not started" },
  { id: "completed", label: "Completed" },
];

function statusOf(c: CourseSummary): Status {
  if (!c.enrollment) return "not_started";
  return c.enrollment.completed_at ? "completed" : "in_progress";
}

export function Catalog({ courses, initialCategory }: { courses: CourseSummary[]; initialCategory?: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [category, setCategory] = useState<string>(
    initialCategory && courses.some((c) => c.category?.slug === initialCategory) ? initialCategory : "all",
  );
  const q = useDeferredValue(query.trim().toLowerCase());

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    courses.forEach((c) => c.category && seen.set(c.category.slug, c.category.name));
    return [...seen.entries()];
  }, [courses]);

  const filtered = courses.filter((c) => {
    if (status !== "all" && statusOf(c) !== status) return false;
    if (category !== "all" && c.category?.slug !== category) return false;
    if (q && ![c.title, c.subtitle, c.description, c.category?.name].some((t) => t?.toLowerCase().includes(q))) return false;
    return true;
  });

  // Nothing published yet (a fresh launch): filters and search would only get in the way.
  if (!courses.length) {
    return (
      <EmptyState
        icon={<GraduationCap aria-hidden />}
        title="Masterclasses are on their way"
        body="The TravelXM team is preparing the first masterclasses. They appear here as soon as they are published."
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div role="radiogroup" aria-label="Filter by status" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {STATUS.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={status === s.id}
              onClick={() => setStatus(s.id)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center rounded-pill px-4 font-ui text-[15px] font-semibold transition-colors duration-120 ease-standard",
                status === s.id ? "bg-ink text-white" : "bg-sunken text-ink hover:bg-line",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className="relative block md:w-80">
          <span className="sr-only">Search courses</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 stroke-[1.75] text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search masterclasses"
            className="h-12 w-full rounded-pill border border-control bg-card pr-12 pl-11 text-[16px] text-ink placeholder:text-muted transition-colors duration-120 focus-visible:border-ink focus-visible:outline-none"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-pill text-muted hover:bg-sunken"
            >
              <X className="size-4 stroke-[2]" aria-hidden />
            </button>
          ) : null}
        </label>
      </div>

      {categories.length > 1 ? (
        <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Topic">
          {[["all", "All topics"] as [string, string], ...categories].map(([slug, name]) => (
            <button
              key={slug}
              role="tab"
              aria-selected={category === slug}
              onClick={() => setCategory(slug)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center rounded-pill border px-4 font-ui text-[15px] font-semibold transition-colors duration-120 ease-standard",
                category === slug ? "border-ink text-ink" : "border-line text-muted hover:border-ink hover:text-ink",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-6 text-[15px] text-muted" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "masterclass" : "masterclasses"}
      </p>

      {filtered.length ? (
        <div className="mt-4 grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c, i) => (
            <CourseCard key={c.id} course={c} priority={i < 3} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-4"
          icon={<Search aria-hidden />}
          title="No masterclasses match"
          body="Try another word or clear the filters."
          action={
            <button
              className="xm-link font-ui text-[15px] font-semibold"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setCategory("all");
              }}
            >
              Clear filters
            </button>
          }
        />
      )}
    </div>
  );
}
