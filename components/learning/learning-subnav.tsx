"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/courses", label: "Courses" },
  { href: "/progress", label: "Progress" },
  { href: "/certificates", label: "Certificates" },
  { href: "/resources", label: "Resources" },
];

/**
 * Large pill tabs at the top of the four Learning lists. Inside a course the
 * course header takes over and its back button returns here.
 */
export function LearningSubnav() {
  const pathname = usePathname();
  if (!TABS.some((t) => t.href === pathname)) return null;
  return (
    <nav aria-label="Learning" className="xm-container pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-[calc(2rem+env(safe-area-inset-top))] lg:pt-8">
      <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-12 items-center rounded-pill px-5 font-ui text-[16px] font-semibold transition-colors duration-120 ease-standard",
                  active ? "bg-ink text-white" : "bg-sunken text-ink hover:bg-line",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
