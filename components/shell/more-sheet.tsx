"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Settings2 } from "lucide-react";
import { HUB_NAV, MODULE_TINT, isNavActive, type HubNavItem } from "@/components/shell/nav-config";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";

type Tile = Pick<HubNavItem, "href" | "label" | "description" | "icon" | "external"> & { active: boolean; tint: string };

function MoreTile({ tile, onNavigate }: { tile: Tile; onNavigate: () => void }) {
  const Icon = tile.icon;
  const className = cn(
    "flex min-h-[76px] items-center gap-3 rounded-lg border p-3 text-left transition-colors duration-120 ease-standard",
    tile.active ? "border-ink bg-card" : "border-line bg-card hover:border-ink",
  );
  const body = (
    <>
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-md text-ink", tile.tint)}>
        <Icon aria-hidden className="size-5 stroke-[1.75]" />
      </span>
      <span className="min-w-0">
        <span className="block font-ui text-[16px] leading-tight font-semibold text-ink">{tile.label}</span>
        <span className="mt-0.5 block text-[15px] leading-snug text-muted">
          {tile.external ? (
            <>
              <ExternalLink aria-hidden className="mr-1 inline size-3.5 stroke-[2] align-[-2px]" />
              Opens in a new tab
            </>
          ) : (
            tile.description
          )}
        </span>
      </span>
    </>
  );
  if (tile.external) {
    return (
      <a href={tile.href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className}>
        {body}
      </a>
    );
  }
  return (
    <Link href={tile.href} onClick={onNavigate} aria-current={tile.active ? "page" : undefined} className={className}>
      {body}
    </Link>
  );
}

/** The bottom sheet behind the "More" tab on phones. Closes itself after a tap. */
export function MoreSheet({ showAdmin, children }: { showAdmin: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const tiles: Tile[] = HUB_NAV.filter((i) => i.mobile === "more").map((i) => ({ ...i, active: isNavActive(pathname, i), tint: MODULE_TINT[i.id] }));
  if (showAdmin) {
    tiles.push({ href: "/admin", label: "Admin portal", description: "Manage courses, trips, offers and books.", icon: Settings2, active: pathname.startsWith("/admin"), tint: "bg-sunken" });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent title="More" description="Everything else in the Hub." side="sheet">
        <ul className="grid grid-cols-1 gap-3 pb-2 sm:grid-cols-2">
          {tiles.map((t) => (
            <li key={t.href}>
              <MoreTile tile={t} onNavigate={() => setOpen(false)} />
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
