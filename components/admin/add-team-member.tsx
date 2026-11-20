"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck, Mail, PenLine, Search, ShieldCheck, UserPlus } from "lucide-react";
import { addTeamMember, lookupTeamMember, setUserRole, type TeamLookup } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Radio, RadioGroup } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";

type Role = "content_manager" | "admin";
type Step = "email" | "member" | "details" | "confirm" | "sent";

const ROLES = [
  { id: "content_manager" as const, icon: PenLine, title: "Content manager", body: "Creates and edits courses, FAM trips, offers, books and links, and sees how agents are progressing." },
  { id: "admin" as const, icon: ShieldCheck, title: "Admin", body: "Everything a content manager does, plus groups, roles, invitations, the team and deleting courses." },
];
const LABEL: Record<"agent" | Role, string> = { agent: "Travel agent", content_manager: "Content manager", admin: "Admin" };

function RolePicker({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <fieldset>
      <legend className="font-ui text-[16px] font-semibold text-ink">Access</legend>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as Role)} className="mt-2 grid gap-3">
        {ROLES.map((o) => (
          <label
            key={o.id}
            className={cn(
              "flex cursor-pointer gap-3 rounded-md border-2 p-4 transition-colors duration-120",
              value === o.id ? "border-primary bg-primary/5" : "border-line hover:border-ink",
            )}
          >
            <Radio value={o.id} className="mt-0.5" aria-label={o.title} />
            <span>
              <span className="flex items-center gap-2 font-ui text-[15px] font-semibold text-ink">
                <o.icon aria-hidden className="size-4 stroke-[2] text-muted" /> {o.title}
              </span>
              <span className="block text-[15px] text-muted">{o.body}</span>
            </span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

/**
 * Admins add a content manager or admin: email first (checked against the Hub), then
 * the name and the access, then one last look at the address. An address that already
 * has an opened account gets its access changed instead, with no email.
 */
export function AddTeamMember() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("content_manager");
  const [lookup, setLookup] = useState<TeamLookup | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setStep("email");
    setEmail("");
    setFirstName("");
    setLastName("");
    setRole("content_manager");
    setLookup(null);
    setUserId(null);
    setError(null);
  }

  function findPerson(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await lookupTeamMember(email);
      if (!r.ok || !r.data) return setError(r.ok ? "Something went wrong" : r.error);
      setLookup(r.data);
      if (r.data.status === "member") {
        setUserId(r.data.userId);
        if (r.data.role !== "agent") setRole(r.data.role);
        return setStep("member");
      }
      setFirstName(r.data.firstName);
      setLastName(r.data.lastName);
      setStep("details");
    });
  }

  function review(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return setError("Enter their first and last name.");
    setError(null);
    setStep("confirm");
  }

  function send() {
    setError(null);
    start(async () => {
      const r = await addTeamMember({ email, first_name: firstName, last_name: lastName, role });
      if (!r.ok) return setError(r.error);
      setUserId(r.data?.userId ?? null);
      setStep("sent");
    });
  }

  function changeAccess() {
    if (!userId) return;
    setError(null);
    start(async () => {
      const r = await setUserRole(userId, role);
      if (!r.ok) return setError(r.error);
      setStep("sent");
    });
  }

  const back = (to: Step) => () => (setStep(to), setError(null));
  const alert = error ? (
    <p role="alert" className="text-[15px] text-danger">
      {error}
    </p>
  ) : null;
  const member = lookup?.status === "member" ? lookup : null;
  const promoted = Boolean(member);
  const title = step === "sent" ? (promoted ? "Access changed" : "Invitation sent") : step === "member" ? "Change their access" : "Add a team member";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus aria-hidden /> Add team member
        </Button>
      </DialogTrigger>
      <DialogContent side="sheet" title={title} description={step === "email" ? "A content manager or admin. We check whether the address has a Hub account first." : undefined}>
        {step === "email" ? (
          <form onSubmit={findPerson} className="space-y-4">
            <Field label="Work email" htmlFor="team-email">
              <Input id="team-email" type="email" inputMode="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </Field>
            {alert}
            <Button type="submit" size="lg" block loading={pending}>
              <Search aria-hidden /> Look up
            </Button>
          </form>
        ) : null}

        {step === "member" && member ? (
          <div className="space-y-5">
            <div className="rounded-md bg-sunken p-4 text-[16px] text-ink">
              <strong className="font-semibold">{member.name ?? email}</strong> already has a Hub account, as {LABEL[member.role]}. Change their access below; they keep the same
              sign-in and no email is sent.
            </div>
            <RolePicker value={role} onChange={setRole} />
            {member.role === role ? <p className="text-[15px] text-muted">They already have {LABEL[role]} access.</p> : null}
            {alert}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" size="lg" onClick={back("email")} disabled={pending}>
                <ArrowLeft aria-hidden /> Change email
              </Button>
              <Button size="lg" onClick={changeAccess} loading={pending} disabled={member.role === role}>
                <ShieldCheck aria-hidden /> Give {LABEL[role]} access
              </Button>
            </div>
          </div>
        ) : null}

        {step === "details" ? (
          <form onSubmit={review} className="space-y-5">
            <p className="flex items-center gap-2 text-[16px] text-ink">
              <Mail aria-hidden className="size-5 shrink-0 stroke-[1.75] text-muted" />
              <span className="min-w-0 truncate font-semibold">{email}</span>
            </p>
            {lookup?.status === "pending" ? <p className="rounded-md bg-sunken p-3 text-[15px] text-ink">Invited before but never opened. Sending again replaces the old link.</p> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="team-first">
                <Input id="team-first" required value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={80} autoComplete="off" />
              </Field>
              <Field label="Last name" htmlFor="team-last">
                <Input id="team-last" required value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={80} autoComplete="off" />
              </Field>
            </div>
            <RolePicker value={role} onChange={setRole} />
            {alert}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" size="lg" onClick={back("email")}>
                <ArrowLeft aria-hidden /> Change email
              </Button>
              <Button type="submit" size="lg">
                Continue
              </Button>
            </div>
          </form>
        ) : null}

        {step === "confirm" ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-line p-5">
              <p className="text-[15px] text-muted">We will email the invitation to</p>
              <p className="xm-subtitle-sm mt-1 break-all text-ink">{email}</p>
              <p className="mt-3 text-[16px] text-ink">
                {firstName} {lastName} · {LABEL[role]}
              </p>
            </div>
            <p className="text-[15px] text-muted">
              Sending creates their account with {LABEL[role]} access and emails them a button that signs them in to Admin. Check the address: the email goes to exactly what you typed.
            </p>
            {alert}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" size="lg" onClick={back("details")} disabled={pending}>
                <ArrowLeft aria-hidden /> Back
              </Button>
              <Button size="lg" onClick={send} loading={pending}>
                <Mail aria-hidden /> Send invitation
              </Button>
            </div>
          </div>
        ) : null}

        {step === "sent" ? (
          <div className="space-y-5">
            <p className="flex items-start gap-3 text-[16px] text-ink">
              <CircleCheck aria-hidden className="mt-0.5 size-6 shrink-0 stroke-[1.75] text-primary" />
              {promoted ? (
                <span>
                  {member?.name ?? email} now has {LABEL[role]} access. They see it the next time they open a page.
                </span>
              ) : (
                <span>
                  {firstName} will get the invitation at <strong className="font-semibold break-all">{email}</strong> in a minute or two. The link in it works for one hour; you can
                  resend it from the Team page.
                </span>
              )}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {userId ? (
                <Button asChild variant="secondary" size="lg">
                  <Link href={`/admin/agents/${userId}`} onClick={() => setOpen(false)}>
                    View their page
                  </Link>
                </Button>
              ) : null}
              <Button size="lg" onClick={reset}>
                <UserPlus aria-hidden /> Add another
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
