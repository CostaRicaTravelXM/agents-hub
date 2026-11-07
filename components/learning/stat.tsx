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
    <div className={cn("rounded-lg bg-sunken p-5 md:p-6", className)}>
      <p className="xm-micro text-muted">{label}</p>
      <p className="mt-3 font-display font-bold text-[40px] leading-none tracking-[-0.02em] text-ink md:text-[48px]">{value}</p>
      {detail ? <p className="mt-2 text-[15px] text-muted">{detail}</p> : null}
    </div>
  );
}
