import { Skeleton } from "@/components/ui/surface";

export default function Loading() {
  return (
    <div className="xm-container pt-6 md:pt-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-12 w-2/3 max-w-md" />
      <Skeleton className="mt-8 h-[260px] w-full rounded-lg md:h-[360px]" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg bg-card shadow-card">
            <Skeleton className="h-[200px] rounded-none" />
            <div className="space-y-3 p-6">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
