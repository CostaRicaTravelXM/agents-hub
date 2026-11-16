import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import { CAMPAIGN, CAMPAIGN_LABEL, campaignTags, normalizeEmail } from "@/lib/campaigns/thanksgiving";
import { addTags, findAdvisor, upsertLead, zohoConfigured } from "@/lib/zoho/client";
import { buildZohoLead, INDEPENDENT_COMPANY } from "@/lib/zoho/fields";

export type Claim = Tables<"hub_campaign_claims">;

/* ---------------------------------------------------------------- cookie */
/**
 * The browser holds a signed claim id and whether it confirmed that claim.
 * Looking up someone else's email sets an unconfirmed cookie, which unlocks nothing.
 */
const COOKIE = "xm_gift";
const TTL_SECONDS = 60 * 60 * 24 * 45;

function secret() {
  const s = process.env.AUTH_RECOVERY_SECRET || env.supabaseServiceKey;
  if (!s) throw new Error("Set AUTH_RECOVERY_SECRET (or SUPABASE_SERVICE_ROLE_KEY) to sign the gift cookie");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", `gift:${secret()}`).update(payload).digest("base64url");
}

/** `confirmed` is true once the advisor has said "yes, this is me" in this browser. */
export async function setClaimCookie(claimId: string, confirmed: boolean) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${claimId}.${exp}.${confirmed ? 1 : 0}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearClaimCookie() {
  (await cookies()).delete(COOKIE);
}

async function readCookie(): Promise<{ id: string; confirmed: boolean } | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, flag, mac] = raw.split(".");
  if (!id || !exp || !flag || !mac || Number(exp) < Date.now() / 1000) return null;
  const expected = Buffer.from(sign(`${id}.${exp}.${flag}`));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return /^[0-9a-f-]{36}$/.test(id) ? { id, confirmed: flag === "1" } : null;
}

/**
 * The claim this browser holds. `unlocked` is true only when this browser
 * confirmed it and the row agrees. Null without a valid cookie.
 */
export async function currentClaim(): Promise<{ claim: Claim; unlocked: boolean } | null> {
  const cookie = await readCookie();
  if (!cookie) return null;
  try {
    const { data } = await createServiceClient()
      .from("hub_campaign_claims")
      .select("*")
      .eq("id", cookie.id)
      .eq("campaign", CAMPAIGN)
      .maybeSingle();
    return data ? { claim: data, unlocked: cookie.confirmed && Boolean(data.confirmed_at) } : null;
  } catch {
    return null;
  }
}

/** True when this email opened the gift, so Hub Home can show the way back to it. Never throws. */
export async function hasConfirmedClaim(email: string) {
  try {
    const { data } = await createServiceClient()
      .from("hub_campaign_claims")
      .select("id")
      .eq("campaign", CAMPAIGN)
      .eq("email", normalizeEmail(email))
      .not("confirmed_at", "is", null)
      .limit(1);
    return Boolean(data?.length);
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- limits */
function hash(value: string) {
  return createHash("sha256").update(`${secret()}:${value}`).digest("base64url").slice(0, 32);
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** True while this key is inside its allowance. Fails open: a database hiccup must not lock advisors out. */
export async function allow(bucket: string, key: string, max: number, windowSeconds: number) {
  try {
    const { data, error } = await createServiceClient().rpc("hub_rate_allow", {
      p_bucket: bucket,
      p_key: hash(key),
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    return error ? true : data !== false;
  } catch {
    return true;
  }
}

/** Cloudflare Turnstile. Passes when the keys are not set. */
export async function passesTurnstile(token: string | null | undefined, ip: string) {
  const cfg = env.turnstile;
  if (!cfg) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: cfg.secret, response: token, ...(ip !== "unknown" ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5_000),
    });
    const body = (await res.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- Hub invite */
/** Where email links should point. Read inside the request, before any after() callback. */
export async function appOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

/**
 * The id of the Hub account for this email, when its owner has actually opened
 * it. Sending an invite creates the account straight away, still unconfirmed;
 * that one does not count, and can be sent the link again.
 */
async function hubAccountId(email: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase.from("profiles").select("id").eq("email", email).limit(1);
    if (!data?.length) return null;
    const { data: found } = await supabase.auth.admin.getUserById(data[0].id);
    return found.user?.email_confirmed_at ? data[0].id : null;
  } catch {
    return null;
  }
}

/** True when this email has a Hub account its owner has opened, so no invite is needed. */
export async function hasHubAccount(email: string) {
  return Boolean(await hubAccountId(email));
}

/**
 * Emails an advisor who already has a Hub account a one-tap sign-in link, with
 * the gift wording and the way back to the kit. Once per claim unless `resend`.
 *
 * Supabase renders the sign-in email from the account's metadata, so the
 * account is marked with gift_email for the moment of the send and unmarked
 * right after; their later sign-in emails stay plain.
 */
async function emailMemberGift(claim: Claim, userId: string, origin: string, resend: boolean): Promise<"member" | "failed"> {
  if (claim.hub_member_emailed_at && !resend) return "member";
  const supabase = createServiceClient();
  let failure: string | null = null;
  try {
    await supabase.auth.admin.updateUserById(userId, { user_metadata: { gift_email: CAMPAIGN } });
    const { error } = await supabase.auth.signInWithOtp({
      email: claim.email,
      // Straight to Hub Home, where the gift tile is.
      options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/dashboard")}` },
    });
    if (error) failure = error.code ?? error.message;
  } finally {
    await supabase.auth.admin.updateUserById(userId, { user_metadata: { gift_email: null } });
  }
  await supabase
    .from("hub_campaign_claims")
    .update(failure ? { hub_invite_error: failure } : { hub_member_emailed_at: new Date().toISOString(), hub_invite_error: null })
    .eq("id", claim.id);
  return failure ? "failed" : "member";
}

/**
 * Emails the advisor a link that creates their Hub account and signs them in.
 * Nothing is usable until the link is opened, so typing someone else's email
 * gives no access. The profile is filled from the claim: what a new advisor
 * typed, or what Zoho holds for a known one. An advisor who already has an
 * account gets a sign-in email instead ("member"). Never throws.
 */
export async function inviteClaimToHub(claimId: string, origin: string, opts: { resend?: boolean } = {}): Promise<"sent" | "member" | "failed" | "skipped"> {
  try {
    const supabase = createServiceClient();
    const { data: claim } = await supabase.from("hub_campaign_claims").select("*").eq("id", claimId).single();
    if (!claim?.confirmed_at) return "skipped";
    const memberId = await hubAccountId(claim.email);
    if (memberId) return await emailMemberGift(claim, memberId, origin, Boolean(opts.resend));

    const first = claim.first_name?.trim() ?? "";
    const last = claim.last_name?.trim() ?? "";
    const company = claim.company?.trim() ?? "";
    const independent = claim.is_independent || company.toLowerCase() === INDEPENDENT_COMPANY.toLowerCase();
    // With a full name and the agency answer the account skips the "finish your profile" step.
    const complete = Boolean(first && last && (company || independent));
    const { error } = await supabase.auth.signInWithOtp({
      email: claim.email,
      options: {
        shouldCreateUser: true,
        data: {
          ...(first ? { first_name: first } : {}),
          ...(last ? { last_name: last } : {}),
          ...(first || last ? { full_name: [first, last].filter(Boolean).join(" ") } : {}),
          company: independent ? null : company || null,
          is_independent: independent,
          ...(complete ? { hub_signup: true } : {}),
          signup_campaign: CAMPAIGN,
        },
        // Must carry a query string: the shared template appends &token_hash=….
        emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/")}`,
      },
    });
    await supabase
      .from("hub_campaign_claims")
      .update(error ? { hub_invite_error: error.code ?? error.message } : { hub_invited_at: new Date().toISOString(), hub_invite_error: null })
      .eq("id", claimId);
    return error ? "failed" : "sent";
  } catch (e) {
    console.error("inviteClaimToHub", e);
    return "failed";
  }
}

/** Re-sends the invites and member emails that failed (most often the hourly email limit). */
export async function retryFailedInvites(origin: string, limit = 100) {
  const tally = { sent: 0, member: 0, failed: 0, skipped: 0 };
  const { data: rows } = await createServiceClient()
    .from("hub_campaign_claims")
    .select("id")
    .eq("campaign", CAMPAIGN)
    .not("confirmed_at", "is", null)
    .is("hub_invited_at", null)
    .is("hub_member_emailed_at", null)
    .not("hub_invite_error", "is", null)
    .order("created_at")
    .limit(limit);
  for (const row of rows ?? []) {
    const result = await inviteClaimToHub(row.id, origin);
    tally[result] += 1;
    // The email limit will refuse the rest too.
    if (result === "failed") break;
  }
  return tally;
}

/* ---------------------------------------------------------------- Zoho hand-off */
/**
 * Sends one claim's current state to Zoho. Safe to call any number of times:
 * the lease lets one request through, and everything sent is idempotent (an
 * upsert by email and tags). Never throws.
 *
 * While Zoho is not connected this does nothing and the claim stays queued
 * (version > synced_version) for syncPendingClaims().
 */
export async function syncClaim(claimId: string): Promise<"sent" | "skipped" | "failed"> {
  if (!zohoConfigured()) return "skipped";
  try {
    const supabase = createServiceClient();
    const { data: version, error } = await supabase.rpc("claim_hub_campaign_sync", { p_id: claimId });
    if (error || version === null || version === undefined) return "skipped";
    const { data: claim } = await supabase.from("hub_campaign_claims").select("*").eq("id", claimId).single();
    if (!claim) return "skipped";

    let lastError: string | null = null;
    let zohoModule = claim.zoho_module as "Leads" | "Contacts" | null;
    let recordId = claim.zoho_record_id;

    // Claims taken while Zoho was down or not connected were never checked against it.
    // Check now, so an existing Lead or Contact is tagged instead of overwritten.
    if (!recordId || !zohoModule) {
      const found = await findAdvisor(claim.email);
      if (!found.ok) lastError = found.message;
      else if (found.data) {
        zohoModule = found.data.module;
        recordId = found.data.id;
      } else {
        // Zoho does not know them: they become a Lead with what they typed.
        const lead = await upsertLead(
          buildZohoLead({
            firstName: claim.first_name ?? "",
            lastName: claim.last_name ?? "",
            email: claim.email,
            agency: claim.company ?? "",
            phone: claim.phone ?? "",
            independent: claim.is_independent,
            leadSource: CAMPAIGN_LABEL,
            channel: claim.channel,
          }),
        );
        if (lead.ok) {
          zohoModule = "Leads";
          recordId = lead.data.id;
        } else lastError = lead.message;
      }
    }
    if (!lastError && zohoModule && recordId) {
      const tagged = await addTags(
        zohoModule,
        recordId,
        campaignTags({
          channel: claim.channel,
          kitDownloaded: Boolean(claim.kit_downloaded_at),
          famOpened: Boolean(claim.fam_opened_at),
          hubInvited: Boolean(claim.hub_invited_at),
        }),
      );
      if (!tagged.ok) lastError = tagged.message;
    }

    await supabase
      .from("hub_campaign_claims")
      .update(
        lastError
          ? { last_error: lastError, sync_claimed_at: null, zoho_module: zohoModule, zoho_record_id: recordId }
          : {
              synced_version: version,
              synced_at: new Date().toISOString(),
              sync_claimed_at: null,
              sync_attempts: 0,
              last_error: null,
              zoho_module: zohoModule,
              zoho_record_id: recordId,
            },
      )
      .eq("id", claimId);
    return lastError ? "failed" : "sent";
  } catch (e) {
    console.error("syncClaim", e);
    return "failed";
  }
}

/** Sends everything that is waiting, oldest first. For the first run after Zoho is connected, and for retries. */
export async function syncPendingClaims(limit = 200) {
  const tally = { sent: 0, failed: 0, skipped: 0, waiting: 0 };
  const supabase = createServiceClient();
  const { data: rows } = await supabase
    .from("hub_campaign_claims")
    .select("id, version, synced_version")
    .eq("campaign", CAMPAIGN)
    .not("confirmed_at", "is", null)
    .order("created_at")
    .limit(2000);
  const pending = (rows ?? []).filter((r) => r.version > r.synced_version);
  tally.waiting = pending.length;
  for (const row of pending.slice(0, limit)) {
    tally[await syncClaim(row.id)] += 1;
  }
  return tally;
}

/** Records a change worth sending to Zoho. */
export async function bumpClaim(claimId: string, patch: Partial<Claim>) {
  const supabase = createServiceClient();
  const { data: current } = await supabase.from("hub_campaign_claims").select("version").eq("id", claimId).single();
  if (!current) return;
  await supabase
    .from("hub_campaign_claims")
    .update({ ...patch, version: current.version + 1, sync_attempts: 0 })
    .eq("id", claimId);
}
