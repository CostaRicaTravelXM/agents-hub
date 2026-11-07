import Link from "next/link";
import type { Viewer } from "@/lib/auth";
import { isStaff } from "@/lib/auth";
import { LogoBadge, Wordmark } from "@/components/brand";
import { BottomTabs, SidebarNav } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";
import { cn } from "@/lib/utils";

export function AppShell({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  const staff = isStaff(viewer.profile);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-card px-4 py-2 font-ui font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-line bg-page px-3 pt-6 pb-3 lg:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2" aria-label="TravelXM Agents Hub home">
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
        <main id="main" className="pb-[calc(84px+env(safe-area-inset-bottom)+24px)] lg:pb-16">
          {children}
        </main>
      </div>

      <BottomTabs showAdmin={staff} name={viewer.profile.full_name} avatarUrl={viewer.profile.avatar_url} />
    </div>
  );
}

/** Standard page frame inside the shell. */
export function Page({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("xm-container pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-[calc(2.5rem+env(safe-area-inset-top))] lg:pt-10", className)}>{children}</div>;
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
    <header className="xm-reveal mb-7 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <h1 className="xm-title">{title}</h1>
        {lead ? <p className="xm-lead mt-3 text-muted">{lead}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-3">{actions}</div> : null}
    </header>
  );
}
