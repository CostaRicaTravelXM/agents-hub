import { Skeleton } from "@/components/ui/surface";

export default function Loading() {
  return (
    <div className="xm-container pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-12 w-2/3 max-w-md" />
      <Skeleton className="mt-6 h-[320px] w-full rounded-xl md:h-[360px]" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[16/10] rounded-lg" />
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
