import { describe, expect, it } from "vitest";
import { buildAgentsHubPayload } from "@/lib/hub/crm-payload";
import { isZohoForm, prefilledCtaUrl } from "@/lib/hub/cta";
import { toEmbedUrl } from "@/lib/hub/video-embed";
import { clampPage, modeFor, pageBox, pageLabel, pickWidth, spreadPages, spreadStart } from "@/lib/books";
import { famTripTiming } from "@/lib/hub/fam";

describe("CRM hand-off payload", () => {
  const now = new Date("2026-11-06T12:00:00Z");
  it("maps an agency agent", () => {
    const p = buildAgentsHubPayload({ first_name: "Ana", last_name: "Agency", company: "Sunset Travel", phone: null, is_independent: false }, "Ana@Example.com", now);
    expect(p).toMatchObject({
      firstName: "Ana",
      lastName: "Agency",
      email: "ana@example.com",
      agency: "Sunset Travel",
      phone: "",
      partnerType: "agency_agent",
      consent: true,
      language: "en",
      page: "/register",
      source: "agents-hub",
      submittedAt: "2026-11-06T12:00:00.000Z",
    });
  });
  it("maps an independent agent with no agency", () => {
    const p = buildAgentsHubPayload({ first_name: "Sol", last_name: "Solo", company: "Ignored", phone: "+506 1", is_independent: true }, "sol@x.test", now);
    expect(p.partnerType).toBe("independent");
    expect(p.agency).toBe("");
    expect(p.phone).toBe("+506 1");
  });
});

describe("Zoho form pre-fill", () => {
  const form = "https://forms.zohopublic.com/TravelXM/form/FAMTRIPS2027/formperma/abc";
  const viewer = { first_name: "Ana", last_name: "Agency", email: "ana@x.test" };
  it("adds the agent's details only on Zoho Forms", () => {
    const url = new URL(prefilledCtaUrl(form, viewer)!);
    expect(url.searchParams.get("Name_First")).toBe("Ana");
    expect(url.searchParams.get("Name_Last")).toBe("Agency");
    expect(url.searchParams.get("Email")).toBe("ana@x.test");
    expect(url.searchParams.get("zf_rszfm")).toBe("1");
  });
  it("fills the agency only on the form whose field name is known", () => {
    const withAgency = { ...viewer, company: "Sunset Travel" };
    expect(new URL(prefilledCtaUrl(form, withAgency)!).searchParams.get("SingleLine")).toBe("Sunset Travel");
    expect(new URL(prefilledCtaUrl(form, { ...withAgency, is_independent: true })!).searchParams.get("SingleLine")).toBe("Independent");
    const other = "https://forms.zohopublic.com/TravelXM/form/OtherForm/formperma/x";
    expect(new URL(prefilledCtaUrl(other, withAgency)!).searchParams.has("SingleLine")).toBe(false);
  });
  it("leaves other links untouched", () => {
    expect(prefilledCtaUrl("https://example.com/form", viewer)).toBe("https://example.com/form");
    expect(prefilledCtaUrl(null, viewer)).toBeNull();
    expect(isZohoForm("https://forms.zohopublic.com.evil.test/x")).toBe(false);
  });
});

describe("video links", () => {
  it("turns share links into embed addresses", () => {
    expect(toEmbedUrl("https://drive.google.com/file/d/AbC_1/view?usp=sharing")).toBe("https://drive.google.com/file/d/AbC_1/preview");
    expect(toEmbedUrl("https://drive.google.com/open?id=AbC_1")).toBe("https://drive.google.com/file/d/AbC_1/preview");
    expect(toEmbedUrl("https://travelxm.wistia.com/medias/abc123")).toBe("https://fast.wistia.net/embed/iframe/abc123");
  });
  it("keeps other links and empty values", () => {
    expect(toEmbedUrl("https://fast.wistia.net/embed/iframe/abc123")).toBe("https://fast.wistia.net/embed/iframe/abc123");
    expect(toEmbedUrl("https://drive.google.com/drive/folders/x")).toBe("https://drive.google.com/drive/folders/x");
    expect(toEmbedUrl(null)).toBeNull();
  });
});

describe("reader page math", () => {
  it("clamps and finds spreads", () => {
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(99, 10)).toBe(10);
    expect(spreadStart(4, "spread")).toBe(3);
    expect(spreadStart(4, "single")).toBe(4);
    expect(spreadPages(9, "spread", 10)).toEqual([9, 10]);
    expect(spreadPages(11, "spread", 11)).toEqual([11]);
  });
  it("labels pages the way a reader says them", () => {
    expect(pageLabel(3, "spread", 140)).toBe("Pages 3–4 of 140");
    expect(pageLabel(12, "single", 140)).toBe("Page 12 of 140");
  });
  it("chooses spread only when both pages are readable", () => {
    expect(modeFor(390, 700, 0.77)).toBe("single");
    expect(modeFor(1024, 700, 0.77)).toBe("spread");
    expect(modeFor(844, 390, 0.77)).toBe("single"); // landscape phone: pages would be too small
    expect(modeFor(810, 830, 0.77)).toBe("single"); // portrait iPad: one large page reads better
    const box = pageBox(1024, 700, 0.77, "spread");
    expect(box.w).toBeLessThanOrEqual(512);
    expect(box.h).toBeLessThanOrEqual(700);
  });
  it("picks the sharper render on retina screens", () => {
    expect(pickWidth(400, 1)).toBe(800);
    expect(pickWidth(400, 3)).toBe(1600);
  });
});

describe("FAM trip dates", () => {
  it("shows the label when the dates are set", () => {
    expect(famTripTiming({ timing_label: "Nov 2026" })).toBe("Nov 2026");
  });
  it.each([null, "", "   "])("reads “Dates to be confirmed” when there is no label (%j)", (label) => {
    expect(famTripTiming({ timing_label: label })).toBe("Dates to be confirmed");
  });
});
