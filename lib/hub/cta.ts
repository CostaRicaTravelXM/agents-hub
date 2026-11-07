/**
 * Interest forms live in Zoho Forms for now. Zoho pre-fills a field when its
 * API name is passed as a query parameter (Name_First, Name_Last, Email). The
 * agent's details are only appended when the link really points at Zoho Forms,
 * so an admin-entered URL can never leak them somewhere else.
 */
const ZOHO_FORMS_HOST = "forms.zohopublic.com";

/** Field API names differ per form. "Agency name" on the FAM trips form, checked against the live form. */
const AGENCY_FIELD_BY_FORM: Record<string, string> = { FAMTRIPS2027: "SingleLine" };

export type CtaViewer = { first_name: string | null; last_name: string | null; email: string; company?: string | null; is_independent?: boolean };

export function isZohoForm(url: string | null | undefined) {
  if (!url) return false;
  try {
    return new URL(url).hostname === ZOHO_FORMS_HOST;
  } catch {
    return false;
  }
}

export function prefilledCtaUrl(url: string | null | undefined, viewer: CtaViewer): string | null {
  if (!url) return null;
  if (!isZohoForm(url)) return url;
  const u = new URL(url);
  if (viewer.first_name) u.searchParams.set("Name_First", viewer.first_name);
  if (viewer.last_name) u.searchParams.set("Name_Last", viewer.last_name);
  u.searchParams.set("Email", viewer.email);
  const form = u.pathname.split("/")[3];
  const agencyField = form ? AGENCY_FIELD_BY_FORM[form] : undefined;
  const agency = viewer.is_independent ? "Independent" : viewer.company;
  if (agencyField && agency) u.searchParams.set(agencyField, agency);
  // Zoho's embed mode: no page chrome, sized for an iframe.
  u.searchParams.set("zf_rszfm", "1");
  return u.toString();
}
