import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { MODULE_TINT, type HubNavItem } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

/** One module on Home: its colour, its name, and how much is inside. The whole surface is the link. */
export function ModuleTile({ item, count, className }: { item: HubNavItem; count?: number | null; className?: string }) {
  const Icon = item.icon;
  const classes = cn(
    "group flex h-full min-h-[148px] flex-col rounded-lg border border-line bg-card p-4 transition-[border-color,box-shadow] duration-200 ease-standard hover:border-ink md:min-h-[172px] md:p-5",
    className,
  );
  const detail = item.external
    ? "Opens in a new tab"
    : typeof count === "number" && count > 0 && item.countNoun
      ? `${count} ${item.countNoun[count === 1 ? 0 : 1]}`
      : item.description;
  const body = (
    <>
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-md text-ink md:size-14", MODULE_TINT[item.id])}>
        <Icon aria-hidden className="size-6 stroke-[1.75]" />
      </span>
      <span className="mt-4 block font-ui text-[17px] leading-tight font-semibold tracking-[-0.01em] text-ink md:text-[20px]">
        {item.label}
        {item.external ? <ExternalLink aria-hidden className="ml-1.5 inline size-4 stroke-[2] align-[-1px] text-muted" /> : null}
      </span>
      <span className="mt-1 block text-[15px] leading-snug text-muted md:text-[16px]">{detail}</span>
    </>
  );
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={classes}>
        {body}
      </a>
    );
  }
  return (
    <Link href={item.href} className={classes}>
      {body}
    </Link>
  );
}
