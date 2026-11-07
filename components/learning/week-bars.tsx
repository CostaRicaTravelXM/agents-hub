import { cn, formatNumber } from "@/lib/utils";

/**
 * Single-series column chart (magnitude over time).
 * One hue (Olive Green, >= 3:1 on white), columns capped at 24px with a 4px rounded
 * data end, a 2px baseline, value labels on the current and peak columns, the rest on hover.
 */
export function WeekBars({
  data,
  unit = "min",
  className,
  label = "Weekly values",
}: {
  data: { label: string; value: number; current?: boolean }[];
  unit?: string;
  className?: string;
  label?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const empty = data.every((d) => !d.value);
  return (
    <figure className={cn("relative w-full", className)}>
      {empty ? <p className="absolute inset-x-0 top-0 grid h-44 place-items-center text-center text-[16px] text-muted">Nothing in these weeks yet</p> : null}
      <div className="relative flex h-44 items-end gap-0.5 border-b-2 border-line" role="list" aria-label={label}>
        {data.map((d, i) => {
          const showValue = (d.current || i === peak) && d.value > 0;
          return (
            <div
              key={d.label}
              role="listitem"
              tabIndex={0}
              aria-label={`${d.label}: ${formatNumber(d.value)} ${unit}`}
              className="group relative flex h-full flex-1 flex-col items-center justify-end outline-none"
            >
              <span
                className={cn(
                  "pointer-events-none mb-1 font-ui text-[15px] font-semibold text-ink tabular-nums transition-opacity duration-120",
                  showValue ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                )}
              >
                {formatNumber(d.value)}
              </span>
              <div
                className={cn(
                  "w-full max-w-6 rounded-t-[4px] bg-olive transition-[height,opacity] duration-[340ms] ease-standard",
                  !d.current && "opacity-70 group-hover:opacity-100",
                )}
                style={{ height: d.value ? `${Math.max(2, (d.value / max) * 82)}%` : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-0.5" aria-hidden>
        {/* Every third date: at a readable size all eight do not fit on a phone. Each column still names its own date for screen readers. */}
        {data.map((d, i) => (
          <span key={d.label} className={cn("min-w-0 flex-1 text-center text-[15px] whitespace-nowrap", d.current ? "font-semibold text-ink" : "text-muted")}>
            {(data.length - 1 - i) % 3 === 0 ? d.label : null}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        {label}, in {unit}
      </figcaption>
    </figure>
  );
}

/** Horizontal single-series bars with the value at the tip (ranked lists: destinations, lessons). */
export function BarList({
  items,
  unit,
  empty = "No data for this period yet.",
}: {
  items: { label: string; value: number; sublabel?: string; href?: string }[];
  unit: string;
  empty?: string;
}) {
  if (!items.length) return <p className="py-6 text-[15px] text-muted">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3.5" aria-label={`Ranked by ${unit}`}>
      {items.map((i) => (
        <li key={i.label} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[15px] font-semibold text-ink">
              {i.label}
              {i.sublabel ? <span className="ml-2 font-normal text-muted">{i.sublabel}</span> : null}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 flex-1">
              <div
                className="h-full rounded-r-[4px] bg-olive opacity-80 transition-[width,opacity] duration-[340ms] ease-standard group-hover:opacity-100"
                style={{ width: `${Math.max(1, (i.value / max) * 100)}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right font-ui text-[15px] font-semibold text-ink tabular-nums">
              {formatNumber(i.value)} <span className="font-normal text-muted">{unit}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
