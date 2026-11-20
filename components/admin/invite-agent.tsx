"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck, Mail, Search, UserPlus } from "lucide-react";
import { inviteAgent, lookupAgentForInvite, resendAgentInvite, type InviteLookup } from "@/app/actions/admin";
import { notify } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";

type Step = "email" | "details" | "confirm" | "sent";
type Details = { firstName: string; lastName: string; company: string; isIndependent: boolean };
const EMPTY: Details = { firstName: "", lastName: "", company: "", isIndependent: false };

const SOURCE_NOTE: Record<string, string> = {
  hub: "Invited before but never opened. Sending again replaces the old link.",
  Contacts: "Found in Zoho as a Contact. Check the details before sending.",
  Leads: "Found in Zoho as a Lead. Check the details before sending.",
};

/**
 * Admins create an advisor's account: email first (checked against the Hub and Zoho),
 * then the same details an advisor gives when registering, then one last look at the
 * address, because the invitation goes to whatever was typed.
 */
export function InviteAgent() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState<Details>(EMPTY);
  const [lookup, setLookup] = useState<InviteLookup | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setStep("email");
    setEmail("");
    setDetails(EMPTY);
    setLookup(null);
    setAgentId(null);
    setError(null);
  }

  function findPerson(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await lookupAgentForInvite(email);
      if (!r.ok || !r.data) return setError(r.ok ? "Something went wrong" : r.error);
      setLookup(r.data);
      if (r.data.status === "member") return;
      setDetails({ firstName: r.data.firstName, lastName: r.data.lastName, company: r.data.isIndependent ? "" : r.data.company, isIndependent: r.data.isIndependent || r.data.company.toLowerCase() === "independent" });
      setStep("details");
    });
  }

  function review(e: React.FormEvent) {
    e.preventDefault();
    if (!details.firstName.trim() || !details.lastName.trim()) return setError("Enter their first and last name.");
    if (!details.isIndependent && !details.company.trim()) return setError("Enter their agency, or tick that they work on their own.");
    setError(null);
    setStep("confirm");
  }

  function send() {
    setError(null);
    start(async () => {
      const r = await inviteAgent({ email, first_name: details.firstName, last_name: details.lastName, company: details.isIndependent ? "" : details.company, is_independent: details.isIndependent });
      if (!r.ok) return setError(r.error);
      setAgentId(r.data?.agentId ?? null);
      setStep("sent");
    });
  }

  const set = (patch: Partial<Details>) => setDetails((d) => ({ ...d, ...patch }));
  const alert = error ? (
    <p role="alert" className="text-[15px] text-danger">
      {error}
    </p>
  ) : null;

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
          <UserPlus aria-hidden /> Invite agent
        </Button>
      </DialogTrigger>
      <DialogContent
        side="sheet"
        title={step === "sent" ? "Invitation sent" : "Invite an agent"}
        description={step === "email" ? "We check the Hub and Zoho first, so you don't type what we already know." : undefined}
      >
        {step === "email" ? (
          <form onSubmit={findPerson} className="space-y-4">
            <Field label="Email" htmlFor="invite-email">
              <Input id="invite-email" type="email" inputMode="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </Field>
            {lookup?.status === "member" ? (
              <div role="status" className="rounded-md bg-sunken p-4 text-[16px] text-ink">
                <strong className="font-semibold">{lookup.name ?? email}</strong> already has a Hub account. They can sign in with this email.{" "}
                <Link href={`/admin/agents/${lookup.agentId}`} className="xm-link font-semibold">
                  View agent
                </Link>
              </div>
            ) : null}
            {alert}
            <Button type="submit" size="lg" block loading={pending}>
              <Search aria-hidden /> Look up
            </Button>
          </form>
        ) : null}

        {step === "details" ? (
          <form onSubmit={review} className="space-y-4">
            <p className="flex items-center gap-2 text-[16px] text-ink">
              <Mail aria-hidden className="size-5 shrink-0 stroke-[1.75] text-muted" />
              <span className="min-w-0 truncate font-semibold">{email}</span>
            </p>
            {lookup && lookup.status !== "member" && lookup.source ? <p className="rounded-md bg-sunken p-3 text-[15px] text-ink">{SOURCE_NOTE[lookup.source]}</p> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="invite-first">
                <Input id="invite-first" required value={details.firstName} onChange={(e) => set({ firstName: e.target.value })} maxLength={80} autoComplete="off" />
              </Field>
              <Field label="Last name" htmlFor="invite-last">
                <Input id="invite-last" required value={details.lastName} onChange={(e) => set({ lastName: e.target.value })} maxLength={80} autoComplete="off" />
              </Field>
            </div>
            <Field label="Agency or company" htmlFor="invite-company" hint={details.isIndependent ? "Not needed: they work on their own." : "The agency they book through."}>
              <Input
                id="invite-company"
                value={details.isIndependent ? "" : details.company}
                onChange={(e) => set({ company: e.target.value })}
                disabled={details.isIndependent}
                maxLength={160}
                autoComplete="off"
              />
            </Field>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-line bg-card px-4 py-3">
              <Checkbox checked={details.isIndependent} onCheckedChange={(c) => set({ isIndependent: c === true, ...(c === true ? { company: "" } : {}) })} />
              <span className="font-ui text-[16px] font-semibold text-ink">Solo or independent agent</span>
            </label>
            {alert}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" size="lg" onClick={() => (setStep("email"), setError(null))}>
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
                {details.firstName} {details.lastName} · {details.isIndependent ? "Independent agent" : details.company}
              </p>
            </div>
            <p className="text-[15px] text-muted">
              Sending creates their account and emails them from the TravelXM team, with a button that signs them straight in. Check the address: the email goes to exactly what you typed.
            </p>
            {alert}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" size="lg" onClick={() => (setStep("details"), setError(null))} disabled={pending}>
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
              <span>
                {details.firstName} will get the invitation at <strong className="font-semibold break-all">{email}</strong> in a minute or two. The link in it works for one hour; you can resend it from their page.
              </span>
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {agentId ? (
                <Button asChild variant="secondary" size="lg">
                  <Link href={`/admin/agents/${agentId}`} onClick={() => setOpen(false)}>
                    View agent
                  </Link>
                </Button>
              ) : null}
              <Button size="lg" onClick={reset}>
                <UserPlus aria-hidden /> Invite another
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** On an agent's page while the account is unopened: send the one-tap link again. */
export function ResendInvite({ userId, invited }: { userId: string; invited: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await resendAgentInvite(userId);
          if (!r.ok) return void notify.error("Invitation not sent", { description: r.error });
          notify.success("Invitation sent", { description: "The new link works for one hour." });
        })
      }
    >
      <Mail aria-hidden /> {invited ? "Resend invitation" : "Send an invitation"}
    </Button>
  );
}
