"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  ChartNoAxesColumn,
  FolderOpen,
  House,
  LayoutDashboard,
  Settings2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; match?: string[] };

export const desktopNav: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen, match: ["/courses", "/learn"] },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumn },
  { href: "/resources", label: "Resources", icon: FolderOpen },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const mobileNav: Item[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/courses", label: "Courses", icon: BookOpen, match: ["/courses", "/learn"] },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumn, match: ["/progress", "/certificates"] },
  { href: "/resources", label: "Resources", icon: FolderOpen },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function isActive(pathname: string, item: Item) {
  const prefixes = item.match ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function SidebarNav({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {desktopNav.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-11 items-center gap-3 rounded-md px-3 font-ui text-[15px] font-semibold transition-colors duration-120 ease-standard",
              active ? "bg-card text-ink shadow-card" : "text-body hover:bg-sunken hover:text-ink",
            )}
          >
            <Icon
              aria-hidden
              className={cn("size-5 stroke-[1.75] transition-colors duration-120", active ? "text-primary" : "text-muted group-hover:text-ink")}
            />
            {item.label}
          </Link>
        );
      })}
      {showAdmin ? (
        <>
          <div className="mx-3 my-3 h-px bg-line" />
          <Link
            href="/admin"
            className="group flex h-11 items-center gap-3 rounded-md px-3 font-ui text-[15px] font-semibold text-body transition-colors duration-120 ease-standard hover:bg-sunken hover:text-ink"
          >
            <Settings2 aria-hidden className="size-5 stroke-[1.75] text-muted group-hover:text-ink" />
            Admin portal
          </Link>
        </>
      ) : null}
    </nav>
  );
}

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="xm-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {mobileNav.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex h-full flex-col items-center justify-center gap-1 transition-colors duration-120 ease-standard active:translate-y-px"
              >
                <span
                  className={cn(
                    "grid h-7 w-12 place-items-center rounded-pill transition-colors duration-200 ease-standard",
                    active ? "bg-primary/15" : "bg-transparent",
                  )}
                >
                  <Icon aria-hidden className={cn("size-5 stroke-[1.75]", active ? "text-primary-press" : "text-muted")} />
                </span>
                <span className={cn("font-ui text-[12px] font-semibold", active ? "text-ink" : "text-muted")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
