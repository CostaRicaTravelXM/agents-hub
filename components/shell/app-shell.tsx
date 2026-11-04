import Link from "next/link";
import type { Viewer } from "@/lib/auth";
import { isStaff } from "@/lib/auth";
import { LogoBadge, Wordmark } from "@/components/brand";
import { BottomTabs, SidebarNav } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";

export function AppShell({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  const staff = isStaff(viewer.profile);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-card px-4 py-2 font-ui font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-page px-4 pt-6 pb-4 lg:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2" aria-label="TravelXM Academy dashboard">
          <LogoBadge size={56} priority />
          <Wordmark />
        </Link>
        <SidebarNav showAdmin={staff} />
        <div className="mt-auto border-t border-line pt-4">
          <UserMenu
            name={viewer.profile.full_name}
            email={viewer.email}
            avatarUrl={viewer.profile.avatar_url}
            showAdmin={staff}
          />
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile header */}
        <header className="xm-glass-header sticky top-0 z-40 border-b border-line pt-[env(safe-area-inset-top)] lg:hidden">
          <div className="flex h-16 items-center justify-between gap-3 px-4">
            <Link href="/dashboard" aria-label="TravelXM Academy home">
              <Wordmark />
            </Link>
            <UserMenu
              compact
              name={viewer.profile.full_name}
              email={viewer.email}
              avatarUrl={viewer.profile.avatar_url}
              showAdmin={staff}
            />
          </div>
        </header>

        <main id="main" className="pb-[calc(64px+env(safe-area-inset-bottom)+24px)] lg:pb-16">
          {children}
        </main>
      </div>

      <BottomTabs />
    </div>
  );
}

/** Standard page frame inside the shell. */
export function Page({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`xm-container pt-6 md:pt-10 ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  lead,
  actions,
}: {
  title: string;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="xm-reveal mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <h1 className="xm-title">{title}</h1>
        {lead ? <p className="xm-lead mt-4 text-muted">{lead}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-3">{actions}</div> : null}
    </header>
  );
}
