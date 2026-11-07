import type { Metadata } from "next";
import { LogOut, Users } from "lucide-react";
import { requireViewer, ROLE_LABEL } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { Avatar } from "@/components/shell/user-menu";
import { JoinGroupForm, ProfileForm } from "@/components/profile-forms";
import { SendMyResetLink } from "@/components/auth-forms";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/surface";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-line py-8 md:grid-cols-[260px_minmax(0,1fr)] md:gap-10 md:py-10">
      <div>
        <h2 className="font-ui text-[18px] font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1.5 text-[15px] text-muted">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: groups } = await supabase.rpc("my_groups");
  const p = viewer.profile;

  return (
    <Page className="max-w-[1040px]">
      <PageHeader title="Your profile" lead="Your name appears on your certificates exactly as it is here." />

      <div className="mb-8 flex items-center gap-4 rounded-lg bg-sunken p-5 md:gap-5 md:p-6">
        <Avatar name={p.full_name} url={p.avatar_url} size={64} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-[20px] font-semibold text-ink">{p.full_name ?? viewer.email}</p>
          <p className="text-[15px] text-muted">
            {[p.is_independent ? "Independent agent" : p.company, p.country].filter(Boolean).join(", ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={p.role === "agent" ? "neutral" : "inverse"} className={p.role === "agent" ? "bg-white" : undefined}>{ROLE_LABEL[p.role]}</Badge>
            <Badge tone="neutral" className="bg-white">Member since {formatDate(p.created_at, { month: "short", year: "numeric" })}</Badge>
          </div>
        </div>
      </div>

      <Section title="Your details" description="Shown on your certificates and to the TravelXM team.">
        <ProfileForm profile={p} />
      </Section>

      <Section title="Groups" description="Partner programs and cohorts give you access to extra courses. Enter the invite code TravelXM sent you.">
        {groups?.length ? (
          <ul className="mb-6 space-y-2">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center gap-3 rounded-lg bg-sunken p-4">
                <span className="grid size-10 place-items-center rounded-pill bg-toucan text-black">
                  <Users aria-hidden className="size-5 stroke-[1.75]" />
                </span>
                <div className="min-w-0">
                  <p className="font-ui text-[15px] font-semibold text-ink">{g.name}</p>
                  <p className="text-[15px] text-muted">
                    {g.description ? `${g.description}. ` : ""}Joined {formatDate(g.joined_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-5 text-[15px] text-muted">You are not in any group yet.</p>
        )}
        <JoinGroupForm />
      </Section>

      <Section title="Password" description="Changed through a secure link sent to your email.">
        <div className="max-w-md">
          <SendMyResetLink email={viewer.email} />
        </div>
      </Section>

      <Section title="Sign out" description="Sign out of the TravelXM Agents Hub on this device.">
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            <LogOut aria-hidden /> Sign out
          </Button>
        </form>
      </Section>
    </Page>
  );
}
