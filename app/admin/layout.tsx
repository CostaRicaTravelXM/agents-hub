import Link from "next/link";
import { requireStaff, isAdmin, ROLE_LABEL } from "@/lib/auth";
import { LogoBadge, Wordmark } from "@/components/brand";
import { AdminMobileNav, AdminSidebarNav } from "@/components/admin/admin-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { Badge } from "@/components/ui/surface";

export const metadata = { title: { default: "Admin", template: "%s · Admin · TravelXM Academy" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  const admin = isAdmin(viewer.profile);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-page px-4 pt-6 pb-4 lg:flex">
        <Link href="/admin" className="mb-3 flex items-center gap-3 px-2" aria-label="Admin overview">
          <LogoBadge size={56} />
          <Wordmark />
        </Link>
        <div className="mb-6 px-2">
          <Badge tone="inverse">{ROLE_LABEL[viewer.profile.role]}</Badge>
        </div>
        <AdminSidebarNav isAdmin={admin} />
        <div className="mt-auto border-t border-line pt-4">
          <UserMenu name={viewer.profile.full_name} email={viewer.email} avatarUrl={viewer.profile.avatar_url} showAdmin={false} />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="xm-glass-header sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <AdminMobileNav isAdmin={admin} />
            <Wordmark />
          </div>
          <Badge tone="inverse">Admin</Badge>
        </header>
        <main id="main" className="px-4 pt-6 pb-20 md:px-8 md:pt-10 xl:px-12">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
