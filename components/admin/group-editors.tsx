"use client";

import { useState, useTransition } from "react";
import { Copy, RefreshCw, Trash2, UserMinus } from "lucide-react";
import {
  addGroupMembers,
  createGroup,
  deleteGroup,
  regenerateJoinCode,
  removeGroupMember,
  setGroupCourses,
  updateGroup,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Switch, Textarea } from "@/components/ui/form";
import { Confirm } from "@/components/ui/overlay";
import { notify } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

export function GroupForm({
  group,
  canEdit,
}: {
  group?: { id: string; name: string; description: string | null; join_enabled: boolean; join_code: string };
  canEdit: boolean;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [joinEnabled, setJoinEnabled] = useState(group?.join_enabled ?? true);
  const [code, setCode] = useState(group?.join_code ?? "");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const payload = { name, description, join_enabled: joinEnabled, join_code: code || undefined };
          const r = group ? await updateGroup(group.id, payload) : await createGroup(payload);
          if (r && !r.ok) return void notify.error("Group not saved", { description: r.error });
          if (group) notify.success("Group saved");
        });
      }}
    >
      <Field label="Group name" htmlFor="g-name">
        <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} placeholder="e.g. Partner Agencies 2027" />
      </Field>
      <Field label="Description" htmlFor="g-desc" optional hint="Agents see this on the invite page.">
        <Textarea id="g-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} />
      </Field>
      <Field label="Invite code" htmlFor="g-code" optional={!group} hint={group ? "Changing it stops the old link from working." : "Leave empty to generate one."}>
        <Input
          id="g-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          className="font-ui font-semibold tracking-[0.12em]"
          disabled={!canEdit}
          maxLength={24}
        />
      </Field>
      <label className="flex items-center justify-between gap-3 rounded-md border border-line p-4">
        <span>
          <span className="block font-ui text-[14px] font-semibold text-ink">Allow joining with the code</span>
          <span className="block text-[13px] text-muted">Turn off to stop new members joining by link. Admins can still add people.</span>
        </span>
        <Switch checked={joinEnabled} onCheckedChange={setJoinEnabled} disabled={!canEdit} aria-label="Allow joining with the code" />
      </label>
      {canEdit ? (
        <Button type="submit" loading={pending} disabled={name.trim().length < 2}>
          {group ? "Save group" : "Create group"}
        </Button>
      ) : (
        <p className="text-[14px] text-muted">Only admins can change groups.</p>
      )}
    </form>
  );
}

export function InviteLink({
  groupId,
  code,
  enabled,
  canEdit,
  baseUrl,
}: {
  groupId: string;
  code: string;
  enabled: boolean;
  canEdit: boolean;
  baseUrl: string;
}) {
  const [current, setCurrent] = useState(code);
  const [pending, start] = useTransition();
  const link = `${baseUrl.replace(/\/$/, "")}/join/${current}`;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md border-2 border-line bg-page p-2 pl-4">
        <code className="min-w-0 flex-1 truncate font-ui text-[14px] font-semibold text-ink">{link}</code>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            notify.success("Invite link copied");
          }}
        >
          <Copy aria-hidden /> Copy
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[14px] text-muted">
        <span>
          Code <span className="font-ui font-semibold tracking-[0.12em] text-ink">{current}</span>
          {enabled ? "" : " · joining is turned off"}
        </span>
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await regenerateJoinCode(groupId);
                if (!r.ok) return void notify.error("Code not changed", { description: r.error });
                setCurrent(r.data!.code);
                notify.success("New invite code", { description: "The previous link no longer works." });
              })
            }
          >
            <RefreshCw aria-hidden /> New code
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function AddMembers({ groupId }: { groupId: string }) {
  const [emails, setEmails] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addGroupMembers(groupId, emails);
          if (!r.ok) return void notify.error("Members not added", { description: r.error });
          const { added, missing } = r.data!;
          notify.success(`${added} ${added === 1 ? "agent" : "agents"} added`, {
            description: missing.length ? `No account yet for: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}. Send them the invite link.` : undefined,
            duration: missing.length ? 9000 : undefined,
          });
          setEmails("");
        });
      }}
    >
      <Field label="Add agents by email" htmlFor="g-emails" hint="One per line or separated by commas. People without an account yet can use the invite link.">
        <Textarea id="g-emails" rows={3} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="sarah@agency.com, james@agency.com" />
      </Field>
      <Button type="submit" variant="secondary" loading={pending} disabled={!emails.trim()}>
        Add to group
      </Button>
    </form>
  );
}

export function MemberRow({ groupId, member }: { groupId: string; member: { id: string; name: string | null; email: string; company: string | null; joined: string; via: string } }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-ui text-[14px] font-semibold text-ink">{member.name ?? member.email}</p>
        <p className="truncate text-[13px] text-muted">
          {member.email}
          {member.company ? ` · ${member.company}` : ""} · joined {formatDate(member.joined)} {member.via === "code" ? "with the code" : "by an admin"}
        </p>
      </div>
      <Confirm
        trigger={
          <button type="button" aria-label={`Remove ${member.name ?? member.email}`} className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-danger">
            <UserMinus aria-hidden className="size-4 stroke-[2]" />
          </button>
        }
        title="Remove from group?"
        body="They lose access to courses only available to this group. Their progress is kept if they rejoin."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          const r = await removeGroupMember(groupId, member.id);
          if (!r.ok) notify.error("Not removed", { description: r.error });
        }}
      />
    </li>
  );
}

export function GroupCourses({ groupId, courses, selected }: { groupId: string; courses: { id: string; title: string; visibility: string }[]; selected: string[] }) {
  const [ids, setIds] = useState(selected);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {courses.map((c) => (
          <label key={c.id} className="flex items-center gap-3 rounded-md bg-page px-3 py-2.5 text-[14px]">
            <Checkbox checked={ids.includes(c.id)} onCheckedChange={(v) => setIds((x) => (v ? [...x, c.id] : x.filter((i) => i !== c.id)))} />
            <span className="flex-1 text-ink">{c.title}</span>
            <span className="text-[13px] text-muted">{c.visibility === "groups" ? "Groups only" : "Also public"}</span>
          </label>
        ))}
      </div>
      <p className="text-[13px] text-muted">A course set to “Everyone” is visible to all agents regardless of groups. Set it to “Selected groups only” in the course’s Access tab to restrict it.</p>
      <Button
        type="button"
        variant="secondary"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await setGroupCourses(groupId, ids);
            if (!r.ok) return void notify.error("Courses not saved", { description: r.error });
            notify.success("Group courses saved");
          })
        }
      >
        Save courses
      </Button>
    </div>
  );
}

export function DeleteGroup({ groupId, name }: { groupId: string; name: string }) {
  return (
    <Confirm
      trigger={
        <Button variant="danger" size="sm">
          <Trash2 aria-hidden /> Delete group
        </Button>
      }
      title={`Delete “${name}”?`}
      body="Members lose access to its courses. Their progress and certificates are kept."
      confirmLabel="Delete group"
      destructive
      onConfirm={async () => {
        const r = await deleteGroup(groupId);
        if (r && !r.ok) notify.error("Not deleted", { description: r.error });
      }}
    />
  );
}
