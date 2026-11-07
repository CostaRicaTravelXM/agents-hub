import { cn } from "@/lib/utils";

/** Reading column plus a sticky side card on large screens; one column on phones. */
export function DetailLayout({ children, aside, className }: { children: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("xm-container grid gap-10 pt-8 md:pt-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14", className)}>
      <div className="min-w-0 max-w-[68ch]">{children}</div>
      {aside ? <aside className="lg:sticky lg:top-8 lg:self-start">{aside}</aside> : null}
    </div>
  );
}

export function DetailSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("mt-10 first:mt-0", className)}>
      <h2 className="xm-title-sm">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
