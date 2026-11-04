import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: string | number;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg bg-card p-5 shadow-card md:p-6", className)}>
      <p className="xm-micro text-muted">{label}</p>
      <p className="mt-3 font-display text-[40px] leading-none tracking-[0.005em] text-ink md:text-[48px]">{value}</p>
      {detail ? <p className="mt-2 text-[13px] text-muted">{detail}</p> : null}
    </div>
  );
}
