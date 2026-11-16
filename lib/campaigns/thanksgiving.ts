/**
 * Thanksgiving 2026 gift campaign: the values shared by the page, the server
 * actions and the tests. Pure, so client components and unit tests can import it.
 */
export const CAMPAIGN = "thanksgiving-2026";
export const CAMPAIGN_LABEL = "Thanksgiving 2026";

/** Private bucket key of the Costa Rica Selling Kit (scripts/upload-campaign-kit.mts puts it there). */
export const KIT_KEY = "documents/campaigns/thanksgiving-2026/costa-rica-selling-kit.pdf";
export const KIT_FILE_NAME = "TravelXM Costa Rica Selling Kit.pdf";

/** `?ch=` values we expect. Anything else that is a short slug is kept as typed; the rest becomes "direct". */
export const CHANNELS = ["email", "whatsapp", "instagram", "facebook", "linkedin", "website", "hub"] as const;

export function parseChannel(raw: unknown): string {
  const value = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const slug = String(value).trim().toLowerCase();
  return /^[a-z0-9_-]{1,24}$/.test(slug) ? slug : "direct";
}

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

/**
 * "Kate" -> "K•••", "Sunlit Travel" -> "Sun••• Tra•••". Enough for the owner to
 * recognise their record, not enough for a stranger to read it.
 */
export function maskWord(word: string, keep = 1) {
  const chars = Array.from(word.trim());
  if (!chars.length) return "";
  return chars.slice(0, Math.min(keep, Math.max(1, chars.length - 1))).join("") + "•••";
}

export function maskPhrase(phrase: string, keep = 1) {
  return phrase
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((w) => maskWord(w, keep))
    .join(" ");
}

export type MaskedAdvisor = { firstName: string; name: string; agency: string };

export function maskAdvisor(found: { firstName: string; lastName: string; company: string }): MaskedAdvisor {
  return {
    firstName: maskWord(found.firstName),
    name: [maskWord(found.firstName), maskWord(found.lastName)].filter(Boolean).join(" "),
    agency: maskPhrase(found.company, 3),
  };
}

/** Tags written on the Zoho record. Tags need no custom fields, so they work on any CRM. */
export function campaignTags(state: { channel: string; kitDownloaded: boolean; famOpened: boolean; hubInvited?: boolean }) {
  const tags = [CAMPAIGN_LABEL, `TG26 via ${state.channel}`];
  if (state.hubInvited) tags.push("TG26 Hub invited");
  if (state.kitDownloaded) tags.push("TG26 downloaded kit");
  if (state.famOpened) tags.push("TG26 opened FAM");
  return tags;
}

export type ClaimStep =
  | { step: "email" }
  | { step: "confirm"; email: string; masked: MaskedAdvisor }
  | { step: "details"; email: string }
  | { step: "gift"; hub?: HubAccess };

/** What the last screen says about the Hub: an invite is in their inbox, or they already have an account. */
export type HubAccess = { email: string; member: boolean };

export type ActionResult = { ok: true; next: ClaimStep } | { ok: false; error: string; fieldErrors?: Record<string, string> };
