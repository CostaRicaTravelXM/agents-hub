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
