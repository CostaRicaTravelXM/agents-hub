import { ExternalLink as ExternalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A link to another site. It always says so, in words, so nobody is surprised by a new tab. */
export function ExternalLink({
  href,
  children,
  className,
  compact,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** Icon plus screen-reader text instead of the visible phrase. */
  compact?: boolean;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center gap-1.5", className)}>
      {children}
      <ExternalIcon aria-hidden className="size-4 shrink-0 stroke-[2]" />
      {compact ? <span className="sr-only">(opens in a new tab)</span> : <span className="text-[15px] font-normal text-muted">opens in a new tab</span>}
    </a>
  );
}
