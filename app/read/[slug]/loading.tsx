import { Skeleton } from "@/components/ui/surface";

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col" aria-busy="true" aria-label="Opening your book">
      <div className="flex h-16 items-center gap-3 border-b border-line px-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mx-auto h-5 w-48" />
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <Skeleton className="h-[60vh] w-[min(90vw,46vh)] rounded-md" />
      </div>
      <p className="pb-8 text-center text-[16px] text-muted">Opening your book…</p>
    </div>
  );
}
