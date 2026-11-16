"use server";

import { after } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import {
  allow,
  appOrigin,
  bumpClaim,
  clearClaimCookie,
  clientIp,
  currentClaim,
  hasHubAccount,
  inviteClaimToHub,
  passesTurnstile,
  setClaimCookie,
  syncClaim,
} from "@/lib/campaigns/claims";
import { CAMPAIGN, maskAdvisor, normalizeEmail, parseChannel, type ActionResult } from "@/lib/campaigns/thanksgiving";

/**
 * Opens the gift for this browser, then (after the answer is sent) emails the
 * Hub invite and hands the claim to Zoho. Neither can hold the advisor up.
 */
async function openGift(claimId: string, email: string): Promise<ActionResult> {
  await setClaimCookie(claimId, true);
  const [origin, member] = await Promise.all([appOrigin(), hasHubAccount(email)]);
  after(async () => {
    if (!member) await inviteClaimToHub(claimId, origin);
    await syncClaim(claimId);
  });
  return { ok: true, next: { step: "gift", hub: { email, member } } };
}
import { findAdvisor } from "@/lib/zoho/client";

const HOUR = 60 * 60;
const BUSY = "Something went wrong on our side. Please try again in a moment.";

const emailSchema = z.email().max(254);

const detailsSchema = z
  .object({
    first_name: z.string().trim().min(1, "Enter your first name").max(80),
    last_name: z.string().trim().min(1, "Enter your last name").max(80),
    company: z.string().trim().max(120),
    is_independent: z.boolean(),
    phone: z
      .string()
      .trim()
      .max(40)
      .regex(/^[+()\d\s.-]*$/, "Use digits, spaces and + only"),
  })
  .refine((d) => d.is_independent || d.company.length > 0, { path: ["company"], message: "Enter your agency, or tick the box if you work on your own" });

/** Step 1: the advisor types their email. Decides between "is this you?" and the four fields. */
export async function lookupGift(input: { email: string; channel?: string; token?: string | null }): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(normalizeEmail(input.email ?? ""));
  if (!parsed.success) return { ok: false, error: "Enter a valid email address.", fieldErrors: { email: "Enter a valid email address." } };
  const email = parsed.data;

  const ip = await clientIp();
  if (!(await passesTurnstile(input.token, ip))) return { ok: false, error: "We could not confirm you are a person. Please reload the page and try again." };
  // About ten lookups an hour per connection and five per address: fine for a typo, useless for harvesting.
  const [ipOk, emailOk] = await Promise.all([allow("gift-lookup-ip", ip, 10, HOUR), allow("gift-lookup-email", email, 5, HOUR)]);
  if (!ipOk || !emailOk) return { ok: false, error: "Too many tries. Please wait an hour and try again." };

  try {
    const supabase = createServiceClient();
    const { data: existing } = await supabase.from("hub_campaign_claims").select("*").eq("campaign", CAMPAIGN).eq("email", email).maybeSingle();

    // Zoho is asked live. If it is down or not connected, the advisor is simply treated as new.
    const zoho = existing?.zoho_record_id ? null : await findAdvisor(email);
    const found = zoho?.ok ? zoho.data : null;

    let claim = existing;
    if (!claim) {
      const { data, error } = await supabase
        .from("hub_campaign_claims")
        .insert({
          campaign: CAMPAIGN,
          email,
          channel: parseChannel(input.channel),
          known: Boolean(found),
          zoho_module: found?.module ?? null,
          zoho_record_id: found?.id ?? null,
          first_name: found?.firstName || null,
          last_name: found?.lastName || null,
          company: found?.company || null,
        })
        .select("*")
        .single();
      if (error || !data) return { ok: false, error: BUSY };
      claim = data;
    } else if (found && !claim.confirmed_at) {
      const { data } = await supabase
        .from("hub_campaign_claims")
        .update({
          known: true,
          zoho_module: found.module,
          zoho_record_id: found.id,
          first_name: found.firstName || null,
          last_name: found.lastName || null,
          company: found.company || null,
        })
        .eq("id", claim.id)
        .select("*")
        .single();
      claim = data ?? claim;
    }

    await setClaimCookie(claim.id, false);
    // Someone we can name (from Zoho, or from an earlier visit) confirms with one tap. Details stay masked.
    if (claim.known || claim.confirmed_at) {
      return {
        ok: true,
        next: {
          step: "confirm",
          email,
          masked: maskAdvisor({ firstName: claim.first_name ?? "", lastName: claim.last_name ?? "", company: claim.company ?? "" }),
        },
      };
    }
    return { ok: true, next: { step: "details", email } };
  } catch (e) {
    console.error("lookupGift", e);
    return { ok: false, error: BUSY };
  }
}

/** Step 2a: "Yes, open my gift". */
export async function confirmGift(): Promise<ActionResult> {
  const held = await currentClaim();
  if (!held) return { ok: false, error: "Please enter your email again." };
  const { claim } = held;
  if (!claim.known && !claim.confirmed_at) return { ok: true, next: { step: "details", email: claim.email } };
  try {
    if (!claim.confirmed_at) await bumpClaim(claim.id, { confirmed_at: new Date().toISOString() });
    return await openGift(claim.id, claim.email);
  } catch (e) {
    console.error("confirmGift", e);
    return { ok: false, error: BUSY };
  }
}

/** Step 2b: the four fields, for advisors Zoho does not know yet. */
export async function submitGiftDetails(input: {
  first_name: string;
  last_name: string;
  company: string;
  is_independent: boolean;
  phone: string;
}): Promise<ActionResult> {
  const held = await currentClaim();
  if (!held) return { ok: false, error: "Please enter your email again." };
  const { claim } = held;
  // Records we already know are never edited from here: nobody has proved they own that email.
  if (claim.known || claim.confirmed_at) return confirmGift();

  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  try {
    await bumpClaim(claim.id, {
      first_name: d.first_name,
      last_name: d.last_name,
      company: d.is_independent ? null : d.company,
      is_independent: d.is_independent,
      phone: d.phone || null,
      confirmed_at: new Date().toISOString(),
    });
    return await openGift(claim.id, claim.email);
  } catch (e) {
    console.error("submitGiftDetails", e);
    return { ok: false, error: BUSY };
  }
}

/** "Not you? Use another email". */
export async function resetGift(): Promise<ActionResult> {
  await clearClaimCookie();
  return { ok: true, next: { step: "email" } };
}

/** "Send it again" on the last screen. Only for the browser that confirmed the claim. */
export async function resendHubInvite(): Promise<{ ok: boolean; message: string }> {
  const held = await currentClaim();
  if (!held?.unlocked) return { ok: false, message: "Please enter your email again." };
  const { claim } = held;
  if (!(await allow("gift-invite-email", claim.email, 3, HOUR))) return { ok: false, message: "We already sent it a few times. Check your spam folder, or try again in an hour." };
  const result = await inviteClaimToHub(claim.id, await appOrigin());
  if (result === "member") return { ok: true, message: "You already have a Hub account. Sign in with this email." };
  if (result === "sent") return { ok: true, message: `Sent. Look for an email from TravelXM at ${claim.email}.` };
  return { ok: false, message: "We could not send it just now. Wait a minute and try again." };
}
