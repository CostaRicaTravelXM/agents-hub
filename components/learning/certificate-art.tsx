import { LogoBadge } from "@/components/brand";
import { cn } from "@/lib/utils";

/** The certificate face, as agents see it on /certificates and in the PDF. */
export function CertificateArt({
  name,
  courseTitle,
  footer,
  titleAs: Title = "p",
  compact,
  className,
}: {
  name: string;
  courseTitle: string;
  footer: React.ReactNode;
  titleAs?: "p" | "h2" | "h3";
  /** Tighter on small phones, full size from 640px up. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("bg-page", compact ? "p-3 sm:p-5" : "p-4 md:p-5", className)}>
      <div className={cn("relative border-4 border-stone px-6 text-center", compact ? "py-5 sm:py-8" : "py-8")}>
        <LogoBadge size={56} className={cn("mx-auto", compact && "max-sm:size-10")} />
        <p className={cn("xm-micro text-body", compact ? "mt-3 sm:mt-4" : "mt-4")}>Certificate of completion</p>
        <p
          className={cn(
            "font-serif leading-tight font-bold text-ink italic",
            compact ? "mt-2 text-[22px] sm:mt-3 sm:text-[26px]" : "mt-3 text-[26px]",
          )}
        >
          {name}
        </p>
        <span aria-hidden className="mx-auto mt-3 block h-1 w-12 bg-primary" />
        <Title
          className={cn(
            "font-display leading-none text-ink uppercase",
            compact ? "mt-3 text-[24px] sm:mt-4 sm:text-[28px] md:text-[32px]" : "mt-4 text-[28px] md:text-[32px]",
          )}
        >
          {courseTitle}
        </Title>
        <p className={cn("text-[13px] text-muted", compact ? "mt-3 sm:mt-4" : "mt-4")}>{footer}</p>
      </div>
    </div>
  );
}
