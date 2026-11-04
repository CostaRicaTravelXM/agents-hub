"use client";

import Link from "next/link";
import Image from "next/image";
import { Award, ChevronDown, LogOut, Settings2, UserRound } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { cn, initials } from "@/lib/utils";

export function Avatar({ name, url, size = 40, className }: { name: string | null; url?: string | null; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-pill bg-inverse font-ui font-semibold text-cloudy", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {url ? <Image src={url} alt="" fill sizes={`${size}px`} className="object-cover" unoptimized /> : initials(name)}
    </span>
  );
}

export function UserMenu({
  name,
  email,
  avatarUrl,
  showAdmin,
  compact,
}: {
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  showAdmin: boolean;
  compact?: boolean;
}) {
  // Non-modal: a modal menu locks page scroll and sets pointer-events: none on
  // <body>. If a menu item navigates while that lock is held, the next page can
  // open with the header and tabs unresponsive.
  return (
    <Menu modal={false}>
      <MenuTrigger
        className={cn(
          "flex items-center gap-3 rounded-md text-left transition-colors duration-120 ease-standard hover:bg-sunken",
          compact ? "gap-1.5 py-1 pr-2 pl-1" : "w-full p-2",
        )}
        aria-label="Account menu"
      >
        <Avatar name={name} url={avatarUrl} size={compact ? 36 : 40} />
        {!compact ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-ui text-[14px] font-semibold text-ink">{name ?? email}</span>
            <span className="block truncate text-[13px] text-muted">{email}</span>
          </span>
        ) : (
          <ChevronDown aria-hidden className="size-4 stroke-[2] text-muted" />
        )}
      </MenuTrigger>
      <MenuContent align={compact ? "end" : "start"} side={compact ? "bottom" : "top"}>
        <MenuItem asChild>
          <Link href="/profile">
            <UserRound aria-hidden /> Profile
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/certificates">
            <Award aria-hidden /> Certificates
          </Link>
        </MenuItem>
        {showAdmin ? (
          <MenuItem asChild>
            <Link href="/admin">
              <Settings2 aria-hidden /> Admin portal
            </Link>
          </MenuItem>
        ) : null}
        <MenuSeparator />
        <MenuItem onSelect={() => void signOut()}>
          <LogOut aria-hidden /> Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
