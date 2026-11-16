import "server-only";
import { env } from "@/lib/env";
import type { ZohoModule, ZohoRecord } from "@/lib/zoho/fields";

/**
 * Zoho CRM REST API (v7), called straight from the Hub.
 *
 * Nothing here throws: every call returns a result, so a page or a sign-up never
 * breaks because Zoho is slow, down or not connected yet. With the ZOHO_* values
 * unset every call answers `not_configured` and the callers keep their work
 * queued in the database.
 */

export type ZohoFailure = { ok: false; reason: "not_configured" | "auth" | "http" | "network"; message: string; body?: unknown };
export type ZohoResult<T> = { ok: true; data: T } | ZohoFailure;

const TIMEOUT_MS = 8_000;
const API = "/crm/v7";

let cached: { token: string; expiresAt: number; key: string } | null = null;
let refreshing: Promise<ZohoResult<string>> | null = null;

export function zohoConfigured() {
  return Boolean(env.zoho);
}

/** Only for tests: forget the access token. */
export function resetZohoToken() {
  cached = null;
  refreshing = null;
}

function fail(reason: ZohoFailure["reason"], message: string): ZohoFailure {
  return { ok: false, reason, message };
}

async function accessToken(force = false): Promise<ZohoResult<string>> {
  const cfg = env.zoho;
  if (!cfg) return fail("not_configured", "Zoho is not connected");
  if (!force && cached && cached.key === cfg.refreshToken && cached.expiresAt > Date.now() + 60_000) {
    return { ok: true, data: cached.token };
  }
  // One refresh at a time: Zoho limits how many tokens a client may request per minute.
  refreshing ??= (async (): Promise<ZohoResult<string>> => {
    try {
      const res = await fetch(`${cfg.accountsUrl}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          refresh_token: cfg.refreshToken,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      const body = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number; error?: string } | null;
      if (!res.ok || !body?.access_token) return fail("auth", `Zoho refused the refresh token (${body?.error ?? res.status})`);
      cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000, key: cfg.refreshToken };
      return { ok: true, data: body.access_token };
    } catch (e) {
      return fail("network", e instanceof Error ? e.message : String(e));
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function call<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown, retry = true): Promise<ZohoResult<T | null>> {
  const cfg = env.zoho;
  if (!cfg) return fail("not_configured", "Zoho is not connected");
  const token = await accessToken();
  if (!token.ok) return token;
  try {
    const res = await fetch(`${cfg.apiUrl}${API}${path}`, {
      method,
      headers: { Authorization: `Zoho-oauthtoken ${token.data}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.status === 401 && retry) {
      const fresh = await accessToken(true);
      if (!fresh.ok) return fresh;
      return call<T>(method, path, body, false);
    }
    // A search with no match answers 204 with no body.
    if (res.status === 204) return { ok: true, data: null };
    const json = (await res.json().catch(() => null)) as T | null;
    if (!res.ok) return { ...fail("http", `Zoho responded ${res.status}: ${describe(json)}`), body: json };
    return { ok: true, data: json };
  } catch (e) {
    return fail("network", e instanceof Error ? e.message : String(e));
  }
}

function describe(json: unknown) {
  const j = json as { code?: string; message?: string; data?: { code?: string; message?: string }[] } | null;
  const first = j?.data?.[0];
  return [first?.code ?? j?.code, first?.message ?? j?.message].filter(Boolean).join(" ") || "no details";
}

type RowResult = {
  code?: string;
  status?: string;
  message?: string;
  action?: string;
  details?: { id?: string; api_name?: string; duplicate_record?: { id?: string; module?: { api_name?: string } } };
};

function firstRow(json: { data?: RowResult[] } | null): ZohoResult<RowResult> {
  const row = json?.data?.[0];
  if (!row) return fail("http", "Zoho returned no result row");
  if (row.status !== "success") return fail("http", `Zoho refused the record: ${row.code ?? ""} ${row.message ?? ""}`.trim());
  return { ok: true, data: row };
}

export type FoundRecord = { module: ZohoModule; id: string; firstName: string; lastName: string; company: string };

/** The record with this email in one module, or null. */
export async function findByEmail(module: ZohoModule, email: string): Promise<ZohoResult<FoundRecord | null>> {
  const fields = module === "Leads" ? "id,First_Name,Last_Name,Company" : "id,First_Name,Last_Name,Account_Name";
  const res = await call<{ data?: Record<string, unknown>[] }>(
    "GET",
    `/${module}/search?email=${encodeURIComponent(email.trim().toLowerCase())}&fields=${fields}&per_page=1`,
  );
  if (!res.ok) return res;
  const row = res.data?.data?.[0];
  if (!row || typeof row.id !== "string") return { ok: true, data: null };
  const account = row.Account_Name as { name?: string } | string | null | undefined;
  return {
    ok: true,
    data: {
      module,
      id: row.id,
      firstName: text(row.First_Name),
      lastName: text(row.Last_Name),
      company: module === "Leads" ? text(row.Company) : typeof account === "string" ? account : text(account?.name),
    },
  };
}

/** Contacts first (they are customers already), then Leads. */
export async function findAdvisor(email: string): Promise<ZohoResult<FoundRecord | null>> {
  const contact = await findByEmail("Contacts", email);
  if (!contact.ok || contact.data) return contact;
  return findByEmail("Leads", email);
}

/** Lead fields Zoho cannot do without; never dropped to get past a duplicate. */
const REQUIRED_LEAD_FIELDS = new Set(["Email", "Last_Name", "Company"]);

/**
 * Creates a Lead and never changes an existing record.
 *
 * This is a plain insert, not an upsert: this CRM marks Phone (and Email) as
 * unique, and an upsert updates whichever record matches any unique field, so
 * two advisors sharing an office phone would be merged into one Lead.
 *
 * - Zoho already has this email: that record is returned untouched (`created: false`).
 * - Another unique field clashes (the phone): the Lead is created without that field.
 */
export async function createLead(record: ZohoRecord): Promise<ZohoResult<{ id: string; module: ZohoModule; created: boolean; dropped: string[] }>> {
  const data = { ...record };
  const dropped: string[] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    // Workflow rules run, so a "welcome email" rule set up in Zoho fires for new leads.
    const res = await call<{ data?: RowResult[] }>("POST", "/Leads", { data: [data], trigger: ["workflow"] });
    const row = (res.ok ? res.data : (res.body as { data?: RowResult[] } | null | undefined))?.data?.[0];
    if (row?.status === "success" && row.details?.id) return { ok: true, data: { id: row.details.id, module: "Leads", created: true, dropped } };
    if (row?.code === "DUPLICATE_DATA") {
      const field = row.details?.api_name;
      const existing = row.details?.duplicate_record;
      if (field === "Email" && existing?.id) {
        const zohoModule: ZohoModule = existing.module?.api_name === "Contacts" ? "Contacts" : "Leads";
        return { ok: true, data: { id: existing.id, module: zohoModule, created: false, dropped } };
      }
      if (field && field in data && !REQUIRED_LEAD_FIELDS.has(field)) {
        delete data[field];
        dropped.push(field);
        continue;
      }
    }
    if (!res.ok) return res;
    const checked = firstRow(res.data);
    return checked.ok ? fail("http", "Zoho did not return the record id") : checked;
  }
  return fail("http", "Zoho kept refusing the Lead as a duplicate");
}

export async function updateRecord(module: ZohoModule, id: string, record: ZohoRecord): Promise<ZohoResult<true>> {
  const res = await call<{ data?: RowResult[] }>("PUT", `/${module}/${encodeURIComponent(id)}`, { data: [record] });
  if (!res.ok) return res;
  const row = firstRow(res.data);
  return row.ok ? { ok: true, data: true } : row;
}

/** Adds tags without touching the ones the record already has. */
export async function addTags(module: ZohoModule, id: string, tags: string[]): Promise<ZohoResult<true>> {
  if (!tags.length) return { ok: true, data: true };
  const res = await call<{ data?: RowResult[] }>("POST", `/${module}/${encodeURIComponent(id)}/actions/add_tags`, {
    tags: tags.map((name) => ({ name })),
    over_write: false,
  });
  if (!res.ok) return res;
  const row = firstRow(res.data);
  return row.ok ? { ok: true, data: true } : row;
}

function text(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}
