import { buildZohoLead, LEAD_SOURCES, type ZohoRecord } from "@/lib/zoho/fields";

/**
 * Contract of the n8n "TravelXM — Agents Hub" workflow (TravelXM Front,
 * n8n/README.md). It creates or updates the Zoho CRM lead with Lead Source
 * "Agents Hub" and sends the welcome email once per address. Pure, so it can
 * be unit tested; the sending lives in crm.ts.
 */
export type AgentsHubPayload = {
  firstName: string;
  lastName: string;
  email: string;
  agency: string;
  phone: string;
  partnerType: "agency_agent" | "independent" | "host_agency";
  consent: true;
  language: "en";
  page: string;
  source: "agents-hub";
  submittedAt: string;
};

export function buildAgentsHubPayload(
  profile: { first_name: string | null; last_name: string | null; company: string | null; phone: string | null; is_independent: boolean },
  email: string,
  now = new Date(),
): AgentsHubPayload {
  return {
    firstName: (profile.first_name ?? "").trim(),
    lastName: (profile.last_name ?? "").trim(),
    email: email.trim().toLowerCase(),
    agency: profile.is_independent ? "" : (profile.company ?? "").trim(),
    phone: (profile.phone ?? "").trim(),
    partnerType: profile.is_independent ? "independent" : "agency_agent",
    consent: true,
    language: "en",
    page: "/register",
    source: "agents-hub",
    submittedAt: now.toISOString(),
  };
}

/**
 * The same sign-up as a Zoho CRM Lead, for when the Hub writes to Zoho itself
 * (ZOHO_* set) instead of going through n8n. Lead Source stays "Agents Hub".
 */
export function buildAgentsHubZohoLead(
  profile: { first_name: string | null; last_name: string | null; company: string | null; phone: string | null; is_independent: boolean },
  email: string,
): ZohoRecord {
  return buildZohoLead({
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    email,
    agency: profile.company ?? "",
    phone: profile.phone ?? "",
    independent: profile.is_independent,
    leadSource: LEAD_SOURCES.agentsHub,
  });
}
