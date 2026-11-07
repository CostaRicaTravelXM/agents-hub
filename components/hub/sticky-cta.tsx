import { cn } from "@/lib/utils";

/**
 * On phones and small tablets the main action of a detail page floats just above
 * the bottom bar, so it is reachable without scrolling. On large screens the same
 * content is shown inside the sticky side card instead.
 */
export function StickyCta({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <>
      {/* White behind the button and the bar, so page text never shows between them. */}
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-page from-75% to-transparent px-4 pt-8 pb-[calc(96px+env(safe-area-inset-bottom))] lg:hidden",
          className,
        )}
      >
        <div className="pointer-events-auto mx-auto max-w-[480px] rounded-pill">{children}</div>
      </div>
      {/* Space so the page can scroll past the button. */}
      <div aria-hidden className="h-24 lg:hidden" />
    </>
  );
}
