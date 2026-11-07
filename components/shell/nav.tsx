"use client";

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

const tabClass = "flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-[24px] transition-colors duration-200 ease-standard active:scale-[.97]";
const tabLabel = "font-ui text-[14px] leading-tight font-semibold max-[359px]:tracking-[-0.03em] min-[360px]:text-[15px]";

function tabState(active: boolean) {
  return active ? "bg-white text-ink" : "text-white/85 hover:text-white";
}

/**
 * Phones and small tablets: there is no top bar, so the page runs to the top of the
 * screen. A dark bar floats above the page with five large, always labelled tabs.
 * Profile holds the sign out button; everything else is one tap away in "More".
 */
export function BottomTabs({ showAdmin, name, avatarUrl }: { showAdmin: boolean; name: string | null; avatarUrl?: string | null }) {
  const pathname = usePathname();
  const tabs = HUB_NAV.filter((i) => i.mobile === "tab" && i.id !== "profile");
  const profile = HUB_NAV.find((i) => i.id === "profile")!;
  const moreActive = isMoreActive(pathname);
  const profileActive = isNavActive(pathname, profile);
  return (
    <nav
      aria-label="Main"
      className="xm-on-dark fixed inset-x-2 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[520px] rounded-[28px] bg-ink p-1 shadow-raised sm:inset-x-3 lg:hidden"
    >
      <ul className="grid h-[64px] grid-cols-5">
        {tabs.map((item) => {
          const active = isNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={cn(tabClass, tabState(active))}>
                <Icon aria-hidden className="size-[22px] stroke-[1.75]" />
                <span className={tabLabel}>{item.tabLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <MoreSheet showAdmin={showAdmin}>
            <button type="button" aria-haspopup="dialog" className={cn(tabClass, tabState(moreActive))}>
              <LayoutGrid aria-hidden className="size-[22px] stroke-[1.75]" />
              <span className={tabLabel}>More</span>
            </button>
          </MoreSheet>
        </li>
        <li>
          <Link href={profile.href} aria-current={profileActive ? "page" : undefined} className={cn(tabClass, tabState(profileActive))}>
            {avatarUrl ? <Avatar name={name} url={avatarUrl} size={24} /> : <UserRound aria-hidden className="size-[22px] stroke-[1.75]" />}
            <span className={tabLabel}>{profile.label}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
