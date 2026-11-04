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

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  company: z.string().trim().min(2, "Enter your agency or company").max(160),
  country: z.string().trim().min(2, "Choose your country"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
  next: z.string().optional(),
});

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, password, full_name, company, country, next } = parsed.data;
  const supabase = await createClient();
  const nextPath = safeNext(next);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, company, country },
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
  return { message: `If ${email.data} has an Academy account, a reset link is on its way. It works for 1 hour.` };
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
