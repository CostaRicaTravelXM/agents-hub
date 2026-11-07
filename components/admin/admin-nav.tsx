"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BookMarked,
  BookOpen,
  ChartNoAxesCombined,
  ChevronLeft,
  Link2,
  Menu as MenuIcon,
  PlaneTakeoff,
  Tags,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean; adminOnly?: boolean; section?: string };
const items: Item[] = [
  { href: "/admin", label: "Overview", icon: ChartNoAxesCombined, exact: true },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/groups", label: "Groups", icon: Users },
  { href: "/admin/agents", label: "Agents", icon: UserRound },
  { href: "/admin/fam-trips", label: "FAM Trips", icon: PlaneTakeoff, section: "Hub" },
  { href: "/admin/offers", label: "Offers", icon: BadgePercent },
  { href: "/admin/books", label: "Books", icon: BookMarked },
  { href: "/admin/links", label: "Links", icon: Link2 },
];

function Links({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {items
        .filter((i) => isAdmin || !i.adminOnly)
        .map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href === "/admin/courses" && pathname.startsWith("/admin/lessons"));
          const Icon = item.icon;
          return (
            <Link
              data-section={item.section}
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex h-11 items-center gap-3 rounded-md px-3 font-ui text-[15px] font-semibold transition-colors duration-120 ease-standard",
                active ? "bg-card text-ink shadow-card" : "text-body hover:bg-sunken hover:text-ink",
                item.section && "mt-3 border-t border-line pt-3 rounded-t-none",
              )}
            >
              <Icon aria-hidden className={cn("size-5 stroke-[1.75]", active ? "text-primary" : "text-muted group-hover:text-ink")} />
              {item.label}
            </Link>
          );
        })}
      <div className="mx-3 my-3 h-px bg-line" />
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex h-11 items-center gap-3 rounded-md px-3 font-ui text-[15px] font-semibold text-body transition-colors duration-120 hover:bg-sunken hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-5 stroke-[1.75] text-muted" />
        Back to the Hub
      </Link>
    </nav>
  );
}

export function AdminSidebarNav({ isAdmin }: { isAdmin: boolean }) {
  return <Links isAdmin={isAdmin} />;
}

export function AdminMobileNav({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Dialog>
      <DialogTrigger aria-label="Open admin menu" className="grid size-10 place-items-center rounded-md text-ink hover:bg-sunken">
        <MenuIcon aria-hidden className="size-5 stroke-[1.75]" />
      </DialogTrigger>
      <DialogContent title="Admin portal" side="sheet">
        <Links isAdmin={isAdmin} />
      </DialogContent>
    </Dialog>
  );
}
