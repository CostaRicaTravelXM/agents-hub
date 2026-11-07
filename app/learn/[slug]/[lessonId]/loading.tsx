import { Skeleton } from "@/components/ui/surface";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading lesson">
      <div className="h-16" />
      <div className="xm-theatre">
        <div className="xm-theatre-frame aspect-video" />
      </div>
      <div className="mx-auto w-full max-w-[900px] px-4 md:px-8">
        <Skeleton className="mt-6 h-9 w-2/3" />
        <Skeleton className="mt-3 h-5 w-1/2" />
      </div>
    </div>
  );
}
