/**
 * Every Zoho CRM name the Hub relies on, in one place. Pure, so it can be unit tested.
 *
 * The standard Lead fields below exist in every Zoho CRM. The custom ones are
 * null until someone confirms their API name in Zoho (Setup > Developer Hub >
 * APIs > API names): a null field is simply not sent, and the same information
 * still reaches the record as a tag.
 */
export const ZOHO_FIELDS = {
  firstName: "First_Name",
  lastName: "Last_Name",
  email: "Email",
  /** Mandatory on Leads. Independent advisors get INDEPENDENT_COMPANY. */
  company: "Company",
  phone: "Phone",
  leadSource: "Lead_Source",
  /** Custom, to confirm: single line or picklist holding "agency_agent" / "independent". */
  partnerType: null as string | null,
  /** Custom, to confirm: where the advisor came from (email, whatsapp, instagram…). */
  channel: null as string | null,
} as const;

export const INDEPENDENT_COMPANY = "Independent";

export const LEAD_SOURCES = {
  agentsHub: "Agents Hub",
  thanksgiving: "Thanksgiving 2026",
} as const;

export type ZohoModule = "Leads" | "Contacts";
export type ZohoRecord = Record<string, unknown>;

export type LeadInput = {
  firstName: string;
  lastName: string;
  email: string;
  agency: string;
  phone: string;
  independent: boolean;
  leadSource: string;
  channel?: string | null;
};

/** A Zoho Lead from our values. Empty optional values are left out. */
export function buildZohoLead(input: LeadInput): ZohoRecord {
  const f = ZOHO_FIELDS;
  const record: ZohoRecord = {
    [f.email]: input.email.trim().toLowerCase(),
    // Zoho refuses a Lead without a last name.
    [f.lastName]: input.lastName.trim() || input.firstName.trim() || "Advisor",
    [f.company]: input.independent ? INDEPENDENT_COMPANY : input.agency.trim() || INDEPENDENT_COMPANY,
    [f.leadSource]: input.leadSource,
  };
  if (input.firstName.trim()) record[f.firstName] = input.firstName.trim();
  if (input.phone.trim()) record[f.phone] = input.phone.trim();
  if (f.partnerType) record[f.partnerType] = input.independent ? "independent" : "agency_agent";
  if (f.channel && input.channel) record[f.channel] = input.channel;
  return record;
}
