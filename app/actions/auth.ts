"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { clearRecoveryGrant, hasRecoveryGrant } from "@/lib/recovery";
import { safeNext } from "@/lib/utils";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; message?: string } | undefined;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Confirm your email first. We sent you a link when you registered."
          : "That email and password do not match. Check for typos, or use “Forgot your password?” below.",
    };
  }
  redirect(safeNext(parsed.data.next));
}

/** Agency is optional; ticking "independent" clears it. Checkbox values arrive as "on". */
const agencyFields = {
  company: z.string().trim().max(160).optional(),
  is_independent: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
};
function agency(v: { company?: string; is_independent: boolean }) {
  return { company: v.is_independent ? null : v.company || null, is_independent: v.is_independent };
}

const signUpSchema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name").max(60),
  last_name: z.string().trim().min(1, "Enter your last name").max(60),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
  ...agencyFields,
  next: z.string().optional(),
});

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, password, first_name, last_name, next } = parsed.data;
  const supabase = await createClient();
  const nextPath = safeNext(next);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the shared handle_new_user() trigger into public.profiles.
      data: { first_name, last_name, full_name: `${first_name} ${last_name}`, ...agency(parsed.data), hub_signup: true },
      emailRedirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent(nextPath)}`,
    },
  });
  if (error) {
    return {
      error: error.code === "user_already_exists" ? "An account with this email already exists. Sign in instead." : error.message,
    };
  }
  if (!data.session) {
    return { message: `We sent a confirmation link to ${email}. Open it to finish creating your account.` };
  }
  redirect(nextPath);
}

const emailField = z.string().trim().email("Enter a valid email address");

export async function sendMagicLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email: emailField, next: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      // Sign-in only: new accounts register with their name.
      shouldCreateUser: false,
      // Must carry a query string: the shared template appends &token_hash=….
      emailRedirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent(safeNext(parsed.data.next))}`,
    },
  });
  if (error?.code === "over_email_send_rate_limit") {
    return { error: "We just sent you a link. Wait a minute, then try again." };
  }
  // Same answer whether or not the account exists.
  return { message: `If ${parsed.data.email} has a TravelXM account, a sign-in link is on its way. It works once, for 1 hour.` };
}

const signUpWithLinkSchema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name").max(60),
  last_name: z.string().trim().min(1, "Enter your last name").max(60),
  email: emailField,
  ...agencyFields,
  next: z.string().optional(),
});

/** Registers without a password. An existing account just gets a sign-in link. */
export async function signUpWithLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpWithLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { first_name, last_name, email, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: { first_name, last_name, full_name: `${first_name} ${last_name}`, ...agency(parsed.data), hub_signup: true },
      // Must carry a query string: the shared template appends &token_hash=….
      emailRedirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent(safeNext(next))}`,
    },
  });
  if (error?.code === "over_email_send_rate_limit") {
    return { error: "We just sent you a link. Wait a minute, then try again." };
  }
  if (error) return { error: "We could not send the link. Try again in a few minutes." };
  return { message: `We sent a link to ${email}. Open it to finish creating your account.` };
}

/** Finishes an account that arrived without a full name or the agency answer (Google, a sign-in link, the Portal). */
export async function completeAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const parsed = signUpWithLinkSchema.omit({ email: true }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { first_name, last_name, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ first_name, last_name, full_name: `${first_name} ${last_name}`, ...agency(parsed.data), hub_onboarded_at: new Date().toISOString() })
    .eq("id", viewer.id);
  if (error) return { error: "We could not save your name. Try again." };
  redirect(safeNext(next));
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/login?error=google`);
  redirect(data.url);
}

/**
 * Emails a password reset link. Supabase Auth sends the message through the
 * SMTP server configured in supabase/config.toml ([auth.email.smtp]); locally
 * Mailpit captures it at http://127.0.0.1:54324.
 */
async function sendResetLink(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/confirm?next=/reset-password`,
  });
  return error;
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (!email.success) return { fieldErrors: { email: "Enter the email address you signed up with" } };
  const error = await sendResetLink(email.data);
  if (error?.code === "over_email_send_rate_limit") {
    return { error: "We just sent you a link. Wait a minute, then try again." };
  }
  // Same answer whether or not the account exists.
  return { message: `If ${email.data} has a TravelXM account, a reset link is on its way. It works for 1 hour.` };
}

/** Profile page: send the reset link to the signed-in agent's own address. */
export async function sendMyPasswordResetLink(): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const error = await sendResetLink(viewer.email);
  if (error) {
    return {
      error:
        error.code === "over_email_send_rate_limit"
          ? "We just sent you a link. Wait a minute, then try again."
          : "We could not send the email. Try again in a few minutes.",
    };
  }
  return { message: `We sent a link to ${viewer.email}. Open it to choose a new password. It works for 1 hour.` };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer || !(await hasRecoveryGrant(viewer.id))) {
    return { error: "This reset link has expired. Request a new one to change your password." };
  }
  const schema = z
    .object({ password: z.string().min(8, "Use at least 8 characters"), confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "The two passwords are different. Type the same one twice.", path: ["confirm"] });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "That is your current password. Choose a different one."
          : error.code === "weak_password"
            ? "Choose a stronger password: at least 8 characters, mixing letters and numbers."
            : error.message,
    };
  }
  // One use per link, and anyone else signed in to this account is signed out.
  // Redirect (rather than return) because clearing the cookie re-renders the
  // page, which no longer has a grant and would hide the success message.
  await clearRecoveryGrant();
  await supabase.auth.signOut({ scope: "others" });
  redirect("/reset-password?done=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
