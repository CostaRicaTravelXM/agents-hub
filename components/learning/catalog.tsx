"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
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

export function Catalog({ courses }: { courses: CourseSummary[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [category, setCategory] = useState<string>("all");
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
                "inline-flex h-10 shrink-0 items-center rounded-pill border px-4 font-ui text-[14px] font-semibold transition-colors duration-120 ease-standard",
                status === s.id ? "border-ink bg-ink text-cloudy" : "border-line bg-card text-body hover:border-line-strong",
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
            placeholder="Search destinations and topics"
            className="h-12 w-full rounded-md border-2 border-line bg-card pr-10 pl-11 text-[16px] text-ink placeholder:text-muted transition-colors duration-120 focus-visible:border-secondary focus-visible:outline-none"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-sunken"
            >
              <X className="size-4 stroke-[2]" aria-hidden />
            </button>
          ) : null}
        </label>
      </div>

      {categories.length > 1 ? (
        <div className="scrollbar-none -mx-4 mt-4 flex gap-5 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0" role="tablist" aria-label="Destination">
          {[["all", "All destinations"] as [string, string], ...categories].map(([slug, name]) => (
            <button
              key={slug}
              role="tab"
              aria-selected={category === slug}
              onClick={() => setCategory(slug)}
              className={cn(
                "relative -mb-px h-11 shrink-0 font-ui text-[14px] font-semibold transition-colors duration-120 ease-standard",
                "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:bg-primary after:transition-transform after:duration-200 after:ease-standard",
                category === slug ? "text-ink after:scale-x-100" : "text-muted after:scale-x-0 hover:text-ink",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-6 text-[14px] text-muted" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "course" : "courses"}
      </p>

      {filtered.length ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c, i) => (
            <CourseCard key={c.id} course={c} priority={i < 3} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-4"
          icon={<Search aria-hidden />}
          title="No courses match"
          body="Try another destination or clear the filters."
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
