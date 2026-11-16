import { describe, expect, it } from "vitest";
import { campaignTags, maskAdvisor, maskPhrase, maskWord, normalizeEmail, parseChannel } from "@/lib/campaigns/thanksgiving";
import { buildAgentsHubZohoLead } from "@/lib/hub/crm-payload";
import { buildZohoLead } from "@/lib/zoho/fields";

describe("gift link channel", () => {
  it("keeps the channel each link carries", () => {
    expect(parseChannel("email")).toBe("email");
    expect(parseChannel(" WhatsApp ")).toBe("whatsapp");
    expect(parseChannel(["instagram", "email"])).toBe("instagram");
  });
  it("falls back to direct for a missing or odd value", () => {
    expect(parseChannel(undefined)).toBe("direct");
    expect(parseChannel("")).toBe("direct");
    expect(parseChannel("<script>")).toBe("direct");
    expect(parseChannel("a".repeat(40))).toBe("direct");
  });
});

describe("masked advisor details", () => {
  it("shows enough to recognise, not enough to read", () => {
    expect(maskWord("Kate")).toBe("K•••");
    expect(maskPhrase("Sunlit Travel", 3)).toBe("Sun••• Tra•••");
    expect(maskAdvisor({ firstName: "Kate", lastName: "Moss", company: "Sunlit Travel" })).toEqual({
      firstName: "K•••",
      name: "K••• M•••",
      agency: "Sun••• Tra•••",
    });
  });
  it("never reveals a whole short word and copes with blanks", () => {
    expect(maskWord("Al", 3)).toBe("A•••");
    expect(maskWord("X")).toBe("X•••");
    expect(maskWord("  ")).toBe("");
    expect(maskAdvisor({ firstName: "", lastName: "", company: "" })).toEqual({ firstName: "", name: "", agency: "" });
  });
  it("normalises emails", () => {
    expect(normalizeEmail("  Kate@Sunlit-Travel.com ")).toBe("kate@sunlit-travel.com");
  });
});

describe("Zoho tags and leads", () => {
  it("tags the campaign, the channel and what the advisor did", () => {
    expect(campaignTags({ channel: "email", kitDownloaded: false, famOpened: false })).toEqual(["Thanksgiving 2026", "TG26 via email"]);
    expect(campaignTags({ channel: "whatsapp", kitDownloaded: true, famOpened: true })).toEqual([
      "Thanksgiving 2026",
      "TG26 via whatsapp",
      "TG26 downloaded kit",
      "TG26 opened FAM",
    ]);
    expect(campaignTags({ channel: "email", kitDownloaded: false, famOpened: false, hubInvited: true })).toContain("TG26 Hub invited");
  });
  it("builds a campaign Lead and leaves empty fields out", () => {
    expect(
      buildZohoLead({ firstName: " Ana ", lastName: "Agency", email: "Ana@Example.com", agency: "Sunset Travel", phone: "", independent: false, leadSource: "Thanksgiving 2026", channel: "email" }),
    ).toEqual({ Email: "ana@example.com", First_Name: "Ana", Last_Name: "Agency", Company: "Sunset Travel", Lead_Source: "Thanksgiving 2026" });
  });
  it("gives independents a company, which Zoho requires on a Lead", () => {
    const lead = buildZohoLead({ firstName: "Sol", lastName: "Solo", email: "sol@x.test", agency: "Ignored", phone: "+506 1", independent: true, leadSource: "Thanksgiving 2026" });
    expect(lead.Company).toBe("Independent");
    expect(lead.Phone).toBe("+506 1");
  });
  it("always sends a last name, which Zoho requires on a Lead", () => {
    expect(buildZohoLead({ firstName: "Cher", lastName: "", email: "c@x.test", agency: "", phone: "", independent: false, leadSource: "x" }).Last_Name).toBe("Cher");
  });
  it("maps a Hub sign-up to a Lead with the Agents Hub source", () => {
    const lead = buildAgentsHubZohoLead({ first_name: "Ana", last_name: "Agency", company: "Sunset Travel", phone: null, is_independent: false }, "Ana@Example.com");
    expect(lead).toEqual({ Email: "ana@example.com", First_Name: "Ana", Last_Name: "Agency", Company: "Sunset Travel", Lead_Source: "Agents Hub" });
  });
});
