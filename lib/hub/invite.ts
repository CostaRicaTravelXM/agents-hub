import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { INDEPENDENT_COMPANY } from "@/lib/zoho/fields";

export type AdvisorDetails = {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  isIndependent?: boolean | null;
};

/**
 * The account metadata the signup trigger turns into a profile. With a full name and
 * the agency answer (`complete`) the account skips the "finish your profile" step.
 * Zoho's "Independent" company counts as the solo-agent answer.
 */
export function advisorMetadata(d: AdvisorDetails) {
  const first = d.firstName?.trim() ?? "";
  const last = d.lastName?.trim() ?? "";
  const company = d.company?.trim() ?? "";
  const independent = Boolean(d.isIndependent) || company.toLowerCase() === INDEPENDENT_COMPANY.toLowerCase();
  const complete = Boolean(first && last && (company || independent));
  return {
    complete,
    data: {
      ...(first ? { first_name: first } : {}),
      ...(last ? { last_name: last } : {}),
      ...(first || last ? { full_name: [first, last].filter(Boolean).join(" ") } : {}),
      company: independent ? null : company || null,
      is_independent: independent,
      ...(complete ? { hub_signup: true } : {}),
    },
  };
}

/**
 * The Hub account for this email, and whether its owner has opened it. Sending an
 * invite creates the account straight away, still unconfirmed, until the link is used.
 */
export async function hubAccount(email: string): Promise<{ id: string; confirmed: boolean } | null> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("profiles").select("id").eq("email", email).limit(1);
  if (!data?.length) return null;
  const { data: found } = await supabase.auth.admin.getUserById(data[0].id);
  if (!found.user) return null;
  return { id: data[0].id, confirmed: Boolean(found.user.email_confirmed_at) };
}

export type StaffInviteResult = { ok: true; agentId: string | null } | { ok: false; reason: "member" | "too_soon" | "rate_limited" | "failed"; agentId?: string };

/**
 * Staff create the account for an advisor and email them the one-tap link, worded as
 * "TravelXM created your Agents Hub account" (the staff_invite branch of the
 * confirmation email). Nothing is usable until the advisor opens the link. An account
 * that was invited but never opened is updated and sent the link again.
 */
export async function inviteAdvisor(email: string, details: AdvisorDetails, origin: string): Promise<StaffInviteResult> {
  const supabase = createServiceClient();
  const existing = await hubAccount(email);
  if (existing?.confirmed) return { ok: false, reason: "member", agentId: existing.id };

  const { data, complete } = advisorMetadata(details);
  // team_invite: null clears the team wording if this account was once invited as staff.
  const metadata = { ...data, staff_invite: true, team_invite: null };

  if (existing) {
    // Supabase applies `data` only when it creates the account, so refresh an unopened one first.
    const { error } = await supabase.auth.admin.updateUserById(existing.id, { user_metadata: metadata });
    if (error) {
      console.error("inviteAdvisor update", error.code ?? error.message);
      return { ok: false, reason: "failed" };
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        full_name: data.full_name ?? null,
        company: data.company,
        is_independent: data.is_independent,
        ...(complete ? { hub_onboarded_at: new Date().toISOString() } : {}),
      })
      .eq("id", existing.id);
    if (profileError) console.error("inviteAdvisor profile", profileError.message);
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: metadata,
      // Must carry a query string: the template appends &token_hash=….
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/dashboard")}`,
    },
  });
  if (error) {
    console.error("inviteAdvisor send", error.code ?? error.message);
    // Supabase sends one email per address a minute ("only request this after 42 seconds"), and caps the hour.
    if (/after \d+ seconds?/i.test(error.message)) return { ok: false, reason: "too_soon" };
    return { ok: false, reason: error.code === "over_email_send_rate_limit" ? "rate_limited" : "failed" };
  }
  const created = existing ?? (await hubAccount(email));
  return { ok: true, agentId: created?.id ?? null };
}

export type TeamRole = "content_manager" | "admin";
export const TEAM_ROLE_LABEL: Record<TeamRole, string> = { content_manager: "Content manager", admin: "Admin" };
/** Staff accounts carry TravelXM as their company, which also answers the agency question. */
export const TEAM_COMPANY = "TravelXM";

/**
 * The account metadata for a team member: their name, TravelXM as the company, and
 * what the confirmation email needs for its team wording (team_invite branch).
 */
export function teamMetadata(d: { firstName: string; lastName: string }, role: TeamRole, invitedBy?: string | null) {
  const { data } = advisorMetadata({ firstName: d.firstName, lastName: d.lastName, company: TEAM_COMPANY });
  return {
    ...data,
    team_invite: true,
    staff_invite: null,
    team_role_label: TEAM_ROLE_LABEL[role],
    invited_by: invitedBy?.trim() || null,
  };
}

/**
 * An admin adds a content manager or admin. The account and its role exist before the
 * email goes out, so the link can never open an account with the wrong access. The
 * email ("You're on the TravelXM Agents Hub team") signs them in and lands on Admin.
 * An address that already has an opened account is refused here: change its role instead.
 */
export async function inviteTeamMember(
  email: string,
  details: { firstName: string; lastName: string },
  role: TeamRole,
  invitedBy: string | null,
  origin: string,
): Promise<StaffInviteResult> {
  const supabase = createServiceClient();
  const existing = await hubAccount(email);
  if (existing?.confirmed) return { ok: false, reason: "member", agentId: existing.id };

  const metadata = teamMetadata(details, role, invitedBy);
  let id = existing?.id ?? null;
  if (id) {
    const { error } = await supabase.auth.admin.updateUserById(id, { user_metadata: metadata });
    if (error) {
      console.error("inviteTeamMember update", error.code ?? error.message);
      return { ok: false, reason: "failed" };
    }
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: false, user_metadata: metadata });
    if (error || !data.user) {
      console.error("inviteTeamMember create", error?.code ?? error?.message);
      return { ok: false, reason: "failed" };
    }
    id = data.user.id;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role,
      first_name: metadata.first_name ?? null,
      last_name: metadata.last_name ?? null,
      full_name: metadata.full_name ?? null,
      company: TEAM_COMPANY,
      is_independent: false,
      hub_onboarded_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (profileError) {
    console.error("inviteTeamMember profile", profileError.message);
    return { ok: false, reason: "failed", agentId: id };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/admin")}` },
  });
  if (error) {
    console.error("inviteTeamMember send", error.code ?? error.message);
    if (/after \d+ seconds?/i.test(error.message)) return { ok: false, reason: "too_soon", agentId: id };
    return { ok: false, reason: error.code === "over_email_send_rate_limit" ? "rate_limited" : "failed", agentId: id };
  }
  return { ok: true, agentId: id };
}
