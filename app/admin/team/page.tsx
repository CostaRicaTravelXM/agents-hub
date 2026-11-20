import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, ROLE_LABEL } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { AdminHeader, Table, Td, Th } from "@/components/admin/ui";
import { AddTeamMember } from "@/components/admin/add-team-member";
import { ResendInvite } from "@/components/admin/invite-agent";
import { Badge, EmptyState, StatusDot } from "@/components/ui/surface";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Team" };

/** The TravelXM people who run the Hub: content managers and admins, and whether they have opened their account. */
export default async function TeamPage() {
  const viewer = await requireAdmin();
  const supabase = createServiceClient();
  const { data: people } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .in("role", ["admin", "content_manager"])
    .order("role")
    .order("full_name");

  // The team is a handful of people, so asking Auth for each sign-in record is fine.
  const team = await Promise.all(
    (people ?? []).map(async (p) => {
      const { data } = await supabase.auth.admin.getUserById(p.id);
      return { ...p, confirmed: Boolean(data.user?.email_confirmed_at), lastSignIn: data.user?.last_sign_in_at ?? null, invitedAt: data.user?.confirmation_sent_at ?? null };
    }),
  );

  return (
    <>
      <AdminHeader
        title="Team"
        description="The TravelXM people who run the Hub. Content managers look after the content; admins also manage people and access."
        actions={<AddTeamMember />}
      />

      {team.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Access</Th>
              <Th>Status</Th>
              <Th>Last signed in</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {team.map((p) => (
              <tr key={p.id} className="transition-colors duration-120 hover:bg-page">
                <Td>
                  <Link href={`/admin/agents/${p.id}`} className="font-semibold text-ink hover:text-link">
                    {p.full_name ?? p.email}
                  </Link>
                  {p.id === viewer.id ? <span className="ml-2 text-[13px] text-muted">(you)</span> : null}
                  <p className="text-[13px] text-muted">{p.email}</p>
                </Td>
                <Td>
                  <Badge tone={p.role === "admin" ? "inverse" : "neutral"}>{ROLE_LABEL[p.role]}</Badge>
                </Td>
                <Td className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <StatusDot tone={p.confirmed ? "success" : "warning"} />
                    {p.confirmed ? "Active" : "Invited, not opened yet"}
                  </span>
                  {!p.confirmed && p.invitedAt ? <p className="text-[13px] text-muted">Last email {formatDate(p.invitedAt)}</p> : null}
                </Td>
                <Td className="whitespace-nowrap text-muted">{p.lastSignIn ? formatDate(p.lastSignIn) : "Never"}</Td>
                <Td className="text-right">{p.confirmed ? null : <ResendInvite userId={p.id} invited />}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState title="No team members yet" body="Add a content manager or admin to share the work." />
      )}

      <p className="mt-6 max-w-2xl text-[15px] text-muted">
        To change someone&apos;s access, or to remove it, open their page and change their role. Setting it to Travel agent takes them off the team; their account stays.
      </p>
    </>
  );
}
