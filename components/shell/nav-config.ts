import {
  BadgePercent,
  BookOpen,
  Briefcase,
  FolderOpen,
  GraduationCap,
  House,
  PlaneTakeoff,
  UserRound,
  type LucideIcon,
} from "lucide-react";

/**
 * The one list every navigation surface reads: the desktop sidebar, the phone
 * tab bar and its "More" sheet, and the module tiles on Home. Add a module
 * here and it appears everywhere.
 */
export type HubNavItem = {
  id: "home" | "learning" | "fam" | "offers" | "books" | "marketing" | "portal" | "profile";
  href: string;
  label: string;
  /** One plain sentence under the label on Home and in the More sheet. */
  description: string;
  icon: LucideIcon;
  /** Path prefixes that count as "inside" this module. Defaults to href. */
  match?: string[];
  /** Opens another site in a new tab. */
  external?: boolean;
  /** What Home counts on this tile: singular and plural. */
  countNoun?: [string, string];
  /** Shorter name for the bottom bar, where five tabs share the width. */
  tabLabel?: string;
  /** The bottom bar shows these as tabs; everything else lives in the More sheet. */
  mobile: "tab" | "more";
};

const PORTAL_URL = process.env.NEXT_PUBLIC_AGENTS_PORTAL_URL || "";

const ITEMS: HubNavItem[] = [
  { id: "home", href: "/dashboard", label: "Home", description: "Everything in one place.", icon: House, mobile: "tab" },
  {
    id: "learning",
    href: "/courses",
    label: "Learning",
    description: "Masterclasses and your certificates.",
    icon: GraduationCap,
    match: ["/courses", "/learn", "/progress", "/certificates", "/resources"],
    countNoun: ["masterclass", "masterclasses"],
    mobile: "tab",
  },
  { id: "fam", href: "/fam-trips", label: "FAM Trips", tabLabel: "Trips", description: "Come and see Costa Rica with us.", icon: PlaneTakeoff, countNoun: ["trip", "trips"], mobile: "tab" },
  { id: "offers", href: "/offers", label: "Current Offers", description: "Deals you can sell right now.", icon: BadgePercent, countNoun: ["offer", "offers"], mobile: "more" },
  { id: "books", href: "/books", label: "Books", description: "Guides to read page by page.", icon: BookOpen, match: ["/books", "/read"], countNoun: ["book", "books"], mobile: "more" },
  { id: "marketing", href: "/marketing", label: "Marketing Assets", description: "Photos, videos and materials for your clients.", icon: FolderOpen, mobile: "more" },
  {
    id: "portal",
    href: PORTAL_URL,
    label: "Agents Portal",
    description: "Quotes, bookings and commissions.",
    icon: Briefcase,
    external: true,
    mobile: "more",
  },
  { id: "profile", href: "/profile", label: "Profile", description: "Your name, agency and sign-in details.", icon: UserRound, mobile: "tab" },
];

/** Items in display order. The Portal is hidden until its address is configured. */
export const HUB_NAV: HubNavItem[] = ITEMS.filter((i) => !i.external || i.href);

/** Modules shown as tiles on Home: everything except Home itself and Profile. */
export const HOME_MODULES = HUB_NAV.filter((i) => i.id !== "home" && i.id !== "profile");

export function isNavActive(pathname: string, item: HubNavItem) {
  if (item.external) return false;
  const prefixes = item.match ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** True when the current page belongs to one of the modules inside the More sheet. */
export function isMoreActive(pathname: string) {
  return HUB_NAV.some((i) => i.mobile === "more" && isNavActive(pathname, i)) || pathname.startsWith("/admin");
}

/** Each module keeps its brand colour as a soft tint behind its icon. */
export const MODULE_TINT: Record<HubNavItem["id"], string> = {
  home: "bg-sunken",
  learning: "bg-lime/20",
  fam: "bg-turquoise/15",
  offers: "bg-sunset/20",
  books: "bg-toucan/30",
  marketing: "bg-rose/15",
  portal: "bg-olive/20",
  profile: "bg-sunken",
};
