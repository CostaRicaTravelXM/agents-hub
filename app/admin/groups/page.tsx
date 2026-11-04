import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { isAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader, Panel, Table, Td, Th } from "@/components/admin/ui";
import { GroupForm } from "@/components/admin/group-editors";
import { Badge, EmptyState } from "@/components/ui/surface";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Groups" };

export default async function GroupsPage() {
  const viewer = await requireStaff();
  const admin = isAdmin(viewer.profile);
  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, description, join_code, join_enabled, created_at, group_members(user_id), course_groups(course_id)")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminHeader
        title="Groups"
        description="Groups decide who sees restricted courses. Share a group's invite link, or add agents by email."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {groups?.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Group</Th>
                  <Th>Invite code</Th>
                  <Th className="text-right">Members</Th>
                  <Th className="text-right">Courses</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id} className="transition-colors duration-120 hover:bg-page">
                    <Td>
                      <Link href={`/admin/groups/${g.id}`} className="font-semibold text-ink hover:text-link">
                        {g.name}
                      </Link>
                      {g.description ? <p className="line-clamp-1 text-[13px] text-muted">{g.description}</p> : null}
                    </Td>
                    <Td>
                      <span className="font-ui font-semibold tracking-[0.12em] text-ink">{g.join_code}</span>
                      {!g.join_enabled ? <Badge tone="neutral" className="ml-2">Closed</Badge> : null}
                    </Td>
                    <Td className="text-right tabular-nums">{g.group_members.length}</Td>
                    <Td className="text-right tabular-nums">{g.course_groups.length}</Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(g.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={<Users aria-hidden />} title="No groups yet" body="Create a group for a partner program, a cohort or a single agency." />
          )}
        </div>
        <Panel title="New group" description={admin ? "You can add members and courses next." : "Only admins can create groups."}>
          <GroupForm canEdit={admin} />
        </Panel>
      </div>
    </>
  );
}
