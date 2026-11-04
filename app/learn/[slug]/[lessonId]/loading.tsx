import { Skeleton } from "@/components/ui/surface";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading lesson">
      <div className="h-16 border-b border-line" />
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="md:px-8 md:pt-8 lg:px-10">
          <Skeleton className="aspect-video w-full rounded-none md:rounded-lg" />
          <div className="px-4 md:px-0">
            <Skeleton className="mt-6 h-3 w-48" />
            <Skeleton className="mt-3 h-8 w-2/3" />
            <Skeleton className="mt-3 h-4 w-1/2" />
          </div>
        </div>
        <div className="hidden space-y-3 border-l border-line px-4 py-6 lg:block">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
