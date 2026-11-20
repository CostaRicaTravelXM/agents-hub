"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LayoutGrid, Settings2, UserRound } from "lucide-react";
import { HUB_NAV, isMoreActive, isNavActive, type HubNavItem } from "@/components/shell/nav-config";
import { MoreSheet } from "@/components/shell/more-sheet";
import { Avatar } from "@/components/shell/user-menu";
import { cn } from "@/lib/utils";

function SidebarLink({ item, active }: { item: HubNavItem; active: boolean }) {
  const Icon = item.icon;
  const className = cn(
    "group flex h-12 items-center gap-3 rounded-pill px-4 font-ui text-[16px] font-semibold transition-colors duration-120 ease-standard",
    active ? "bg-ink text-white" : "text-body hover:bg-sunken hover:text-ink",
  );
  const icon = <Icon aria-hidden className={cn("size-5 shrink-0 stroke-[1.75] transition-colors duration-120", active ? "text-white" : "text-muted group-hover:text-ink")} />;
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {icon}
        <span className="flex-1">{item.label}</span>
        <ExternalLink aria-hidden className="size-4 shrink-0 stroke-[2] text-muted" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={className}>
      {icon}
      {item.label}
    </Link>
  );
}

export function SidebarNav({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {HUB_NAV.map((item) => (
        <SidebarLink key={item.id} item={item} active={isNavActive(pathname, item)} />
      ))}
      {showAdmin ? (
        <>
          <div className="mx-3 my-3 h-px bg-line" />
          <Link
            href="/admin"
            className="group flex h-12 items-center gap-3 rounded-pill px-4 font-ui text-[16px] font-semibold text-body transition-colors duration-120 ease-standard hover:bg-sunken hover:text-ink"
          >
            <Settings2 aria-hidden className="size-5 stroke-[1.75] text-muted group-hover:text-ink" />
            Admin portal
          </Link>
        </>
      ) : null}
    </nav>
  );
}

const tabClass =
  "relative z-10 flex h-full w-full min-w-0 flex-col items-center justify-center gap-1 rounded-[24px] transition-[color,scale] duration-200 ease-standard active:scale-[.96]";
const tabLabel = "max-w-full truncate px-0.5 font-ui text-[13px] leading-none font-semibold whitespace-nowrap max-[359px]:text-[12px]";
const TAB_COUNT = 5;

function tabState(active: boolean) {
  return active ? "text-ink" : "text-white/80 hover:text-white";
}

/**
 * The white pill behind the active tab. It moves when a tab is tapped, before the page
 * has loaded: the edge in the direction of travel leaves first and the other follows,
 * so the pill stretches toward the new tab and settles there.
 */
function TabPill({ index }: { index: number }) {
  const [pill, setPill] = useState({ index, dir: 0 });
  // Adjusting state during render, React's pattern for state derived from a changing prop.
  if (pill.index !== index) setPill({ index, dir: pill.index < 0 || index < 0 ? 0 : index > pill.index ? 1 : -1 });
  const lead = "220ms var(--ease-standard)";
  const trail = "360ms var(--ease-standard) 60ms";
  const transition = pill.dir > 0 ? `right ${lead}, left ${trail}` : pill.dir < 0 ? `left ${lead}, right ${trail}` : "none";
  const at = Math.max(index, 0);
  return (
    <span
      aria-hidden
      className={cn("absolute inset-y-0 rounded-[24px] bg-white", index < 0 && "opacity-0")}
      style={{ left: `${(at * 100) / TAB_COUNT}%`, right: `${((TAB_COUNT - 1 - at) * 100) / TAB_COUNT}%`, transition }}
    />
  );
}

/**
 * Phones and small tablets: there is no top bar, so the page runs to the top of the
 * screen. A dark bar floats above the page with five labelled tabs.
 * Profile holds the sign out button; everything else is one tap away in "More".
 */
export function BottomTabs({ showAdmin, name, avatarUrl }: { showAdmin: boolean; name: string | null; avatarUrl?: string | null }) {
  const pathname = usePathname();
  const tabs = HUB_NAV.filter((i) => i.mobile === "tab" && i.id !== "profile");
  const profile = HUB_NAV.find((i) => i.id === "profile")!;
  const moreIndex = tabs.length;
  const profileIndex = tabs.length + 1;
  const routeIndex = (() => {
    const tab = tabs.findIndex((item) => isNavActive(pathname, item));
    if (tab >= 0) return tab;
    if (isMoreActive(pathname)) return moreIndex;
    return isNavActive(pathname, profile) ? profileIndex : -1;
  })();
  // A tapped tab lights up straight away; once the new page's path arrives, the route decides again.
  const [tapped, setTapped] = useState<number | null>(null);
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    setTapped(null);
  }
  const shown = tapped ?? routeIndex;
  const tap = (index: number) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || index === routeIndex) return;
    setTapped(index);
  };

  return (
    <nav
      aria-label="Main"
      className="xm-on-dark fixed inset-x-2 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[520px] rounded-[28px] bg-ink p-1 shadow-raised sm:inset-x-3 lg:hidden"
    >
      <ul className="relative grid h-(--tabbar-h) grid-cols-5">
        <TabPill index={shown} />
        {tabs.map((item, i) => {
          const Icon = item.icon;
          return (
            <li key={item.id} className="min-w-0">
              <Link href={item.href} onClick={tap(i)} aria-current={routeIndex === i ? "page" : undefined} className={cn(tabClass, tabState(shown === i))}>
                <Icon aria-hidden className="size-[22px] shrink-0 stroke-[1.75]" />
                <span className={tabLabel}>{item.tabLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0">
          <MoreSheet showAdmin={showAdmin}>
            <button type="button" aria-haspopup="dialog" className={cn(tabClass, tabState(shown === moreIndex))}>
              <LayoutGrid aria-hidden className="size-[22px] shrink-0 stroke-[1.75]" />
              <span className={tabLabel}>More</span>
            </button>
          </MoreSheet>
        </li>
        <li className="min-w-0">
          <Link
            href={profile.href}
            onClick={tap(profileIndex)}
            aria-current={routeIndex === profileIndex ? "page" : undefined}
            className={cn(tabClass, tabState(shown === profileIndex))}
          >
            {avatarUrl ? <Avatar name={name} url={avatarUrl} size={22} /> : <UserRound aria-hidden className="size-[22px] shrink-0 stroke-[1.75]" />}
            <span className={tabLabel}>{profile.label}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
