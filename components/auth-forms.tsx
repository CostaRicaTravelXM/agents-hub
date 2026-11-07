"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CircleAlert, Eye, EyeOff, MailCheck, Send } from "lucide-react";
import {
  completeAccount,
  requestPasswordReset,
  sendMagicLink,
  sendMyPasswordResetLink,
  signIn,
  signInWithGoogle,
  signUp,
  signUpWithLink,
  updatePassword,
  type FormState,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, keepValues } from "@/components/ui/form";

export function FormError({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md bg-card p-4 text-[15px] text-ink shadow-card">
      <CircleAlert aria-hidden className="mt-px size-5 shrink-0 stroke-[1.75] text-danger" />
      <span>{state.error}</span>
    </div>
  );
}

export function SentNotice({
  message,
  title = "Check your inbox",
  icon = <MailCheck className="size-5 stroke-[1.75]" aria-hidden />,
  children,
}: {
  message: string;
  title?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div role="status" className="xm-reveal flex flex-col items-start gap-3 rounded-lg bg-card p-6 shadow-card">
      <span className="grid size-11 place-items-center rounded-pill bg-olive text-white">
        {icon}
      </span>
      <p className="xm-subtitle-sm mt-1">{title}</p>
      <p className="text-[15px] text-body">{message}</p>
      {children}
    </div>
  );
}

const inboxTip = "Not there after a few minutes? Look in your spam or promotions folder.";

/** Agency (optional) with the "I work on my own" box that clears and disables it. */
export function AgencyFields({ company, isIndependent, error }: { company?: string | null; isIndependent?: boolean; error?: string }) {
  const [independent, setIndependent] = useState(Boolean(isIndependent));
  const [value, setValue] = useState(company ?? "");
  return (
    <div className="space-y-3">
      <Field
        label="Agency or company"
        htmlFor="company"
        error={error}
        optional
        hint={independent ? "Not needed: you told us you work on your own." : "The agency you book through, if you have one."}
      >
        <Input
          id="company"
          name="company"
          value={independent ? "" : value}
          onChange={(e) => setValue(e.target.value)}
          disabled={independent}
          autoComplete="organization"
          aria-invalid={!!error}
        />
      </Field>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-line bg-card px-4 py-3">
        <Checkbox
          name="is_independent"
          checked={independent}
          onCheckedChange={(c) => {
            const on = c === true;
            setIndependent(on);
            if (on) setValue("");
          }}
        />
        <span className="font-ui text-[16px] font-semibold text-ink">I am a solo or independent agent</span>
      </label>
    </div>
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-pill text-muted transition-colors duration-120 hover:bg-sunken hover:text-ink"
      >
        {show ? <EyeOff className="size-5 stroke-[1.75]" aria-hidden /> : <Eye className="size-5 stroke-[1.75]" aria-hidden />}
      </button>
    </div>
  );
}

function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next ?? ""} />
      <Button type="submit" variant="secondary" block size="lg">
        <svg viewBox="0 0 24 24" aria-hidden className="size-5">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.94 10.94 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        Continue with Google
      </Button>
    </form>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-4 text-[15px] text-muted">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function MagicLinkForm({ next, onBack }: { next?: string; onBack: () => void }) {
  const [state, action, pending] = useActionState(sendMagicLink, undefined);
  if (state?.message)
    return (
      <SentNotice message={state.message}>
        <p className="text-[15px] text-muted">{inboxTip}</p>
      </SentNotice>
    );
  return (
    <form action={action} onSubmit={keepValues(action)} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormError state={state} />
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={!!state?.fieldErrors?.email} />
      </Field>
      <Button type="submit" block size="lg" loading={pending}>
        <Send aria-hidden /> Email me a sign-in link
      </Button>
      <button type="button" onClick={onBack} className="xm-link block text-[15px]">
        Use my password instead
      </button>
    </form>
  );
}

export function LoginForm({ next, google }: { next?: string; google: boolean }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  const [useLink, setUseLink] = useState(false);
  if (useLink) return <MagicLinkForm next={next} onBack={() => setUseLink(false)} />;
  return (
    <div className="space-y-6">
      {google ? (
        <>
          <GoogleButton next={next} />
          <OrDivider />
        </>
      ) : null}
      <form action={action} onSubmit={keepValues(action)} className="space-y-5" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        <FormError state={state} />
        <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={!!state?.fieldErrors?.email} />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={state?.fieldErrors?.password}
          hint={
            <Link href="/forgot-password" className="xm-link">
              Forgot your password?
            </Link>
          }
        >
          <PasswordInput id="password" name="password" autoComplete="current-password" required aria-invalid={!!state?.fieldErrors?.password} />
        </Field>
        <Button type="submit" block size="lg" loading={pending}>
          Sign in
        </Button>
        <button type="button" onClick={() => setUseLink(true)} className="xm-link block text-[15px]">
          Email me a sign-in link instead
        </button>
      </form>
    </div>
  );
}

function RegisterWithLinkForm({ next, onBack }: { next?: string; onBack: () => void }) {
  const [state, action, pending] = useActionState(signUpWithLink, undefined);
  if (state?.message) return <SentNotice message={state.message} />;
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} onSubmit={keepValues(action)} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormError state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="first_name" error={fe.first_name}>
          <Input id="first_name" name="first_name" autoComplete="given-name" required aria-invalid={!!fe.first_name} />
        </Field>
        <Field label="Last name" htmlFor="last_name" error={fe.last_name}>
          <Input id="last_name" name="last_name" autoComplete="family-name" required aria-invalid={!!fe.last_name} />
        </Field>
      </div>
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={!!fe.email} />
      </Field>
      <AgencyFields error={fe.company} />
      <Button type="submit" block size="lg" loading={pending}>
        <Send aria-hidden /> Email me a link
      </Button>
      <button type="button" onClick={onBack} className="xm-link block text-[15px]">
        Use a password instead
      </button>
    </form>
  );
}

/** Shown only when Google or a sign-in link did not give us a full name. */
export function NameForm({
  firstName,
  lastName,
  company,
  isIndependent,
  next,
}: {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  isIndependent?: boolean;
  next?: string;
}) {
  const [state, action, pending] = useActionState(completeAccount, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} onSubmit={keepValues(action)} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormError state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="first_name" error={fe.first_name}>
          <Input id="first_name" name="first_name" defaultValue={firstName ?? ""} autoComplete="given-name" required aria-invalid={!!fe.first_name} />
        </Field>
        <Field label="Last name" htmlFor="last_name" error={fe.last_name}>
          <Input id="last_name" name="last_name" defaultValue={lastName ?? ""} autoComplete="family-name" required aria-invalid={!!fe.last_name} />
        </Field>
      </div>
      <AgencyFields company={company} isIndependent={isIndependent} error={fe.company} />
      <Button type="submit" block size="lg" loading={pending}>
        Finish creating my account
      </Button>
    </form>
  );
}

export function RegisterForm({ next, google }: { next?: string; google: boolean }) {
  const [state, action, pending] = useActionState(signUp, undefined);
  const [useLink, setUseLink] = useState(false);
  if (useLink) return <RegisterWithLinkForm next={next} onBack={() => setUseLink(false)} />;
  if (state?.message) return <SentNotice message={state.message} />;
  const fe = state?.fieldErrors ?? {};
  return (
    <div className="space-y-6">
      {google ? (
        <>
          <GoogleButton next={next} />
          <OrDivider />
        </>
      ) : null}
      <form action={action} onSubmit={keepValues(action)} className="space-y-5" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        <FormError state={state} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" htmlFor="first_name" error={fe.first_name}>
            <Input id="first_name" name="first_name" autoComplete="given-name" required aria-invalid={!!fe.first_name} />
          </Field>
          <Field label="Last name" htmlFor="last_name" error={fe.last_name}>
            <Input id="last_name" name="last_name" autoComplete="family-name" required aria-invalid={!!fe.last_name} />
          </Field>
        </div>
        <Field label="Email" htmlFor="email" error={fe.email}>
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={!!fe.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={fe.password} hint="At least 8 characters.">
          <PasswordInput id="password" name="password" autoComplete="new-password" required aria-invalid={!!fe.password} />
        </Field>
        <AgencyFields error={fe.company} />
        <Button type="submit" block size="lg" loading={pending}>
          Create account
        </Button>
        <button type="button" onClick={() => setUseLink(true)} className="xm-link block text-[15px]">
          Use an email link instead of a password
        </button>
        <p className="text-[15px] text-muted">
          By creating an account you agree to receive emails from TravelXM about courses, trips and offers for advisors.
        </p>
      </form>
    </div>
  );
}

export function ForgotForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  if (state?.message)
    return (
      <SentNotice message={state.message}>
        <p className="text-[15px] text-muted">{inboxTip}</p>
      </SentNotice>
    );
  return (
    <form action={action} onSubmit={keepValues(action)} className="space-y-5" noValidate>
      <FormError state={state} />
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={defaultEmail}
          required
          aria-invalid={!!state?.fieldErrors?.email}
        />
      </Field>
      <Button type="submit" block size="lg" loading={pending}>
        <Send aria-hidden /> Email me a reset link
      </Button>
    </form>
  );
}

/** Profile: the signed-in agent asks for a reset link at their own address. */
export function SendMyResetLink({ email }: { email: string }) {
  const [state, action, pending] = useActionState(sendMyPasswordResetLink, undefined);
  if (state?.message)
    return (
      <SentNotice message={state.message}>
        <p className="text-[15px] text-muted">{inboxTip}</p>
      </SentNotice>
    );
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <p className="text-[15px] text-body">
        We will send a link to <span className="font-semibold text-ink">{email}</span>. Open it, then choose your new password.
      </p>
      <Button type="submit" variant="secondary" size="lg" loading={pending}>
        <Send aria-hidden /> Email me a reset link
      </Button>
    </form>
  );
}

export function ResetForm() {
  // On success the action redirects to /reset-password?done=1.
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} onSubmit={keepValues(action)} className="space-y-5" noValidate>
      <FormError state={state} />
      <Field label="New password" htmlFor="password" error={state?.fieldErrors?.password} hint="At least 8 characters.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required aria-invalid={!!state?.fieldErrors?.password} />
      </Field>
      <Field label="Type it again" htmlFor="confirm" error={state?.fieldErrors?.confirm}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required aria-invalid={!!state?.fieldErrors?.confirm} />
      </Field>
      <Button type="submit" block size="lg" loading={pending}>
        Save new password
      </Button>
    </form>
  );
}
