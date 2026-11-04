import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { AddMembers, DeleteGroup, GroupCourses, GroupForm, InviteLink, MemberRow } from "@/components/admin/group-editors";

export const metadata: Metadata = { title: "Group" };

export default async function GroupPage({ params }: PageProps<"/admin/groups/[id]">) {
  const viewer = await requireStaff();
  const admin = isAdmin(viewer.profile);
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: group }, { data: courses }] = await Promise.all([
    supabase
      .from("groups")
      .select("*, group_members(user_id, created_at, joined_via, profile:profiles!group_members_user_id_fkey(full_name, email, company)), course_groups(course_id)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("courses").select("id, title, visibility").neq("status", "archived").order("sort_order"),
  ]);
  if (!group) notFound();

  const members = [...group.group_members].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/groups", label: "Groups" }}
        title={group.name}
        description={`${members.length} members · ${group.course_groups.length} courses`}
        actions={admin ? <DeleteGroup groupId={group.id} name={group.name} /> : null}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Panel title="Invite link" description="Anyone who opens it can create an account and join this group in one step.">
            <InviteLink groupId={group.id} code={group.join_code} enabled={group.join_enabled} canEdit={admin} baseUrl={env.appUrl} />
          </Panel>
          <Panel title={`Members (${members.length})`}>
            {admin ? (
              <div className="mb-5 border-b border-line pb-5">
                <AddMembers groupId={group.id} />
              </div>
            ) : null}
            {members.length ? (
              <ul className="divide-y divide-line">
                {members.map((m) => (
                  <MemberRow
                    key={m.user_id}
                    groupId={group.id}
                    member={{
                      id: m.user_id,
                      name: m.profile?.full_name ?? null,
                      email: m.profile?.email ?? "",
                      company: m.profile?.company ?? null,
                      joined: m.created_at,
                      via: m.joined_via,
                    }}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-muted">No members yet. Share the invite link to get started.</p>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Courses for this group">
            <GroupCourses groupId={group.id} courses={courses ?? []} selected={group.course_groups.map((c) => c.course_id)} />
          </Panel>
          <Panel title="Settings">
            <GroupForm group={group} canEdit={admin} />
          </Panel>
        </div>
      </div>
    </>
  );
}
