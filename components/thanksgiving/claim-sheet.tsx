"use client";

/*
 * What opens when the advisor taps "Claim your gift": email, then either a
 * one-tap "is this you?" (Zoho already knows them, details masked) or four
 * short fields, then the kit and a first look at the 2027 FAM trips.
 */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { ArrowRight, Download } from "lucide-react";
import { confirmGift, lookupGift, resendHubInvite, resetGift, submitGiftDetails } from "@/app/thanksgiving/actions";
import type { ActionResult, ClaimStep, HubAccess } from "@/lib/campaigns/thanksgiving";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";

export type SpotlightTrip = { slug: string; title: string; timing: string; nights: number; image: string | null; imageAlt: string | null };

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void; appearance?: string }) => string;
      reset: (id?: string) => void;
    };
  }
}

const TITLES: Record<ClaimStep["step"], string> = {
  email: "Happy Thanksgiving from all of us at TravelXM",
  confirm: "Is this you?",
  details: "Tell us who the gift is for",
  gift: "Your gift is ready",
};

export function ClaimSheet({
  open,
  onOpenChange,
  channel,
  unlocked,
  hub,
  turnstileSiteKey,
  trips,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: string;
  unlocked: boolean;
  hub?: HubAccess;
  turnstileSiteKey?: string;
  trips: SpotlightTrip[];
}) {
  const [step, setStep] = React.useState<ClaimStep>(unlocked ? { step: "gift", hub } : { step: "email" });
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [pending, startTransition] = React.useTransition();

  const run = (action: () => Promise<ActionResult>, onFail?: () => void) =>
    startTransition(async () => {
      setError(null);
      setFieldErrors({});
      let result: ActionResult;
      try {
        result = await action();
      } catch {
        result = { ok: false, error: "We could not reach the server. Check your connection and try again." };
      }
      if (result.ok) setStep(result.next);
      else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        onFail?.();
      }
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="sheet" title={TITLES[step.step]}>
        {error ? (
          <p role="alert" className="mb-4 rounded-md bg-sunken px-4 py-3 text-[15px] text-danger">
            {error}
          </p>
        ) : null}
        {step.step === "email" ? (
          <EmailStep pending={pending} error={fieldErrors.email} siteKey={turnstileSiteKey} onSubmit={(email, token, reset) => run(() => lookupGift({ email, channel, token }), reset)} />
        ) : step.step === "confirm" ? (
          <ConfirmStep step={step} pending={pending} onYes={() => run(confirmGift)} onOther={() => run(resetGift)} />
        ) : step.step === "details" ? (
          <DetailsStep email={step.email} pending={pending} errors={fieldErrors} onSubmit={(d) => run(() => submitGiftDetails(d))} onOther={() => run(resetGift)} />
        ) : (
          <GiftStep trips={trips} hub={step.hub} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmailStep({
  pending,
  error,
  siteKey,
  onSubmit,
}: {
  pending: boolean;
  error?: string;
  siteKey?: string;
  onSubmit: (email: string, token: string | null, reset: () => void) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [token, setToken] = React.useState<string | null>(null);
  const box = React.useRef<HTMLDivElement>(null);
  const widget = React.useRef<string | null>(null);

  const mount = React.useCallback(() => {
    if (!siteKey || !box.current || !window.turnstile || widget.current) return;
    widget.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      callback: setToken,
      "expired-callback": () => setToken(null),
      appearance: "interaction-only",
    });
  }, [siteKey]);
  React.useEffect(mount, [mount]);

  // A token works once, so a failed try needs a new one.
  const reset = () => {
    if (!widget.current) return;
    setToken(null);
    window.turnstile?.reset(widget.current);
  };

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(email, token, reset);
      }}
    >
      <p className="text-copy-sm text-body">
        This year you trusted us with your clients&rsquo; time in Costa Rica. We put together a selling kit to say thank you. Enter your email to open it.
      </p>
      <Field label="Email" htmlFor="gift-email" error={error}>
        <Input
          id="gift-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
        />
      </Field>
      {siteKey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={mount} />
          <div ref={box} />
        </>
      ) : null}
      <Button type="submit" block size="lg" loading={pending} disabled={Boolean(siteKey) && !token}>
        Continue
      </Button>
    </form>
  );
}

function ConfirmStep({
  step,
  pending,
  onYes,
  onOther,
}: {
  step: Extract<ClaimStep, { step: "confirm" }>;
  pending: boolean;
  onYes: () => void;
  onOther: () => void;
}) {
  const rows = [
    ["Email", step.email],
    ["Name", step.masked.name],
    ["Agency", step.masked.agency],
  ].filter(([, value]) => value);
  return (
    <div className="space-y-5">
      <p className="text-copy-sm text-body">We found you in our records. Part of each detail is hidden to keep it private.</p>
      <dl className="divide-y divide-line rounded-md border border-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-[15px] text-muted">{label}</dt>
            <dd className="min-w-0 text-right font-ui text-[16px] font-semibold break-words text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <Button block size="lg" loading={pending} onClick={onYes}>
        Yes, open my gift
      </Button>
      <Button block variant="ghost" disabled={pending} onClick={onOther}>
        Not you? Use another email
      </Button>
    </div>
  );
}

function DetailsStep({
  email,
  pending,
  errors,
  onSubmit,
  onOther,
}: {
  email: string;
  pending: boolean;
  errors: Record<string, string>;
  onSubmit: (d: { first_name: string; last_name: string; company: string; is_independent: boolean; phone: string }) => void;
  onOther: () => void;
}) {
  const [independent, setIndependent] = React.useState(false);
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const value = (name: string) => String(data.get(name) ?? "");
        onSubmit({
          first_name: value("first_name"),
          last_name: value("last_name"),
          company: independent ? "" : value("company"),
          is_independent: independent,
          phone: value("phone"),
        });
      }}
    >
      <p className="text-copy-sm text-body">
        The kit goes to <span className="font-semibold break-all text-ink">{email}</span>. Four short fields and it is yours.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="gift-first" error={errors.first_name}>
          <Input id="gift-first" name="first_name" autoComplete="given-name" required aria-invalid={!!errors.first_name} />
        </Field>
        <Field label="Last name" htmlFor="gift-last" error={errors.last_name}>
          <Input id="gift-last" name="last_name" autoComplete="family-name" required aria-invalid={!!errors.last_name} />
        </Field>
      </div>
      <div className="space-y-3">
        <Field label="Agency or company" htmlFor="gift-company" error={errors.company}>
          <Input id="gift-company" name="company" autoComplete="organization" disabled={independent} aria-invalid={!!errors.company} />
        </Field>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-line bg-card px-4 py-3">
          <Checkbox checked={independent} onCheckedChange={(c) => setIndependent(c === true)} />
          <span className="font-ui text-[16px] font-semibold text-ink">I am a solo or independent agent</span>
        </label>
      </div>
      <Field label="Phone" htmlFor="gift-phone" error={errors.phone} optional>
        <Input id="gift-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!errors.phone} />
      </Field>
      <Button type="submit" block size="lg" loading={pending}>
        Open my gift
      </Button>
      <Button type="button" block variant="ghost" disabled={pending} onClick={onOther}>
        Use another email
      </Button>
    </form>
  );
}

/** Where the advisor's Hub access is: in their inbox, or behind the sign-in they already have. */
function HubNote({ hub }: { hub: HubAccess }) {
  const [note, setNote] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = React.useTransition();
  const inside = (
    <ul className="list-disc space-y-1 pl-5 text-[16px] text-body">
      <li>The 2027 FAM trips</li>
      <li>Masterclasses on selling Costa Rica</li>
      <li>Marketing material, books and current offers</li>
    </ul>
  );
  if (hub.member) {
    return (
      <section aria-labelledby="gift-hub" className="space-y-3 rounded-lg border border-line bg-sunken p-4">
        <h3 id="gift-hub" className="font-ui text-[20px] leading-tight font-semibold text-ink">
          Your Agents Hub is waiting
        </h3>
        <p className="text-[16px] text-body">You already have an Agents Hub account. Sign in to find:</p>
        {inside}
        <Button asChild block variant="secondary">
          <Link href="/login?next=%2F">
            Sign in to the Agents Hub
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </section>
    );
  }
  return (
    <section aria-labelledby="gift-hub" className="space-y-3 rounded-lg border border-line bg-sunken p-4">
      <h3 id="gift-hub" className="font-ui text-[20px] leading-tight font-semibold text-ink">
        Your Agents Hub is ready
      </h3>
      <p className="text-[16px] text-body">
        We also sent your Agents Hub access to <span className="font-semibold break-all text-ink">{hub.email}</span>. Open the link in that email, no password needed, to find:
      </p>
      {inside}
      {note ? (
        <p role="status" className={note.ok ? "text-[15px] text-body" : "text-[15px] text-danger"}>
          {note.message}
        </p>
      ) : null}
      <Button
        block
        variant="secondary"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              setNote(await resendHubInvite());
            } catch {
              setNote({ ok: false, message: "We could not reach the server. Check your connection and try again." });
            }
          })
        }
      >
        Send it again
      </Button>
    </section>
  );
}

function GiftStep({ trips, hub }: { trips: SpotlightTrip[]; hub?: HubAccess }) {
  return (
    <div className="space-y-7">
      <div className="space-y-4">
        <p className="text-copy-sm text-body">
          The Costa Rica Selling Kit is yours to keep and to use with your clients. Thank you for selling Costa Rica with us.
        </p>
        <Button asChild block size="lg">
          <a href="/api/thanksgiving/kit?mode=download">
            <Download aria-hidden />
            Download the Selling Kit (PDF)
          </a>
        </Button>
        <Button asChild block variant="secondary">
          <a href="/api/thanksgiving/kit" target="_blank" rel="noopener">
            Open it in the browser
          </a>
        </Button>
      </div>

      {hub ? <HubNote hub={hub} /> : null}

      {trips.length ? (
        <section aria-labelledby="gift-fam" className="space-y-3">
          <h3 id="gift-fam" className="font-ui text-[17px] font-semibold text-ink">
            A first look at the 2027 FAM trips
          </h3>
          <ul className="space-y-2">
            {trips.map((trip) => (
              <li key={trip.slug}>
                <a
                  href={`/api/thanksgiving/fam?trip=${trip.slug}`}
                  className="flex min-h-18 items-center gap-3 rounded-md border border-line bg-card p-2 pr-3 transition-colors duration-120 ease-standard hover:border-ink"
                >
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-sm bg-sunken">
                    {trip.image ? <Image src={trip.image} alt={trip.imageAlt ?? ""} fill sizes="56px" className="object-cover" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-ui text-[16px] font-semibold text-ink">{trip.title}</span>
                    <span className="block text-[15px] text-muted">
                      {trip.timing} · {trip.nights} nights
                    </span>
                  </span>
                  <ArrowRight aria-hidden className="size-5 shrink-0 stroke-[1.75] text-muted" />
                </a>
              </li>
            ))}
          </ul>
          {hub ? null : (
            <p className="text-[15px] text-muted">
              FAM trips open inside the Agents Hub.{" "}
              <Link href="/register?next=%2Ffam-trips" className="xm-link font-semibold">
                Create your free account
              </Link>{" "}
              or sign in to see them all.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
