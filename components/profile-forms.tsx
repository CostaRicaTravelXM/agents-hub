"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Users } from "lucide-react";
import { saveProfile } from "@/app/actions/profile";
import { joinGroup } from "@/app/actions/learning";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form";
import { notify } from "@/components/ui/toast";
import { COUNTRIES } from "@/lib/countries";
import type { Profile } from "@/lib/auth";

export function ProfileForm({ profile, next, submitLabel = "Save changes" }: { profile: Profile; next?: string; submitLabel?: string }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  const fe = state?.fieldErrors ?? {};
  useEffect(() => {
    if (state?.message) notify.success(state.message);
    if (state?.error) notify.error("Your profile was not saved", { description: state.error });
  }, [state]);
  return (
    <form action={action} className="grid gap-5 md:grid-cols-2" noValidate>
      {next !== undefined ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Full name" htmlFor="full_name" error={fe.full_name} className="md:col-span-2">
        <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} autoComplete="name" required />
      </Field>
      <Field label="Agency or company" htmlFor="company" error={fe.company} optional>
        <Input id="company" name="company" defaultValue={profile.company ?? ""} autoComplete="organization" />
      </Field>
      <Field label="Job title" htmlFor="job_title" error={fe.job_title} optional>
        <Input id="job_title" name="job_title" defaultValue={profile.job_title ?? ""} autoComplete="organization-title" />
      </Field>
      <Field label="Country" htmlFor="country" error={fe.country} optional>
        <NativeSelect id="country" name="country" defaultValue={profile.country ?? ""}>
          <option value="">Choose a country</option>
          {COUNTRIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Phone" htmlFor="phone" error={fe.phone} optional hint="With country code, for urgent booking questions.">
        <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" inputMode="tel" />
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" size="lg" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function JoinGroupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await joinGroup(code);
          if (!res.ok) return void notify.error("Could not join", { description: res.error });
          notify.success(res.data!.alreadyMember ? `You are already in ${res.data!.name}` : `You joined ${res.data!.name}`, {
            description: "Courses for this group now appear in your catalog.",
            action: { label: "View courses", onClick: () => router.push("/courses") },
          });
          setCode("");
        });
      }}
    >
      <label className="sr-only" htmlFor="join-code">
        Invite code
      </label>
      <Input
        id="join-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Invite code, e.g. PARTNER27"
        autoCapitalize="characters"
        autoComplete="off"
        className="font-ui font-semibold tracking-[0.12em] uppercase placeholder:font-normal placeholder:tracking-normal placeholder:normal-case sm:max-w-xs"
      />
      <Button type="submit" variant="secondary" size="lg" loading={pending} disabled={code.trim().length < 4}>
        <Users aria-hidden /> Join group
      </Button>
    </form>
  );
}

export function PasswordHint() {
  return (
    <p className="flex items-center gap-2 text-[14px] text-muted">
      <KeyRound aria-hidden className="size-4 stroke-[2]" /> Use at least 8 characters.
    </p>
  );
}
