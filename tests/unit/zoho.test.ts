import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addTags, createLead, findAdvisor, resetZohoToken, zohoConfigured } from "@/lib/zoho/client";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const token = () => json({ access_token: "tok-1", expires_in: 3600 });
const noMatch = () => new Response(null, { status: 204 });

type Call = { url: string; method: string; body: unknown; auth: string | null };

/** Stands in for Zoho: answers each request from a queue and records what was asked. */
function zoho(...answers: (Response | Error)[]) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const raw = init?.body;
      calls.push({
        url: String(url),
        method: init?.method ?? "GET",
        body: typeof raw === "string" ? JSON.parse(raw) : raw instanceof URLSearchParams ? Object.fromEntries(raw) : null,
        auth: (init?.headers as Record<string, string> | undefined)?.Authorization ?? null,
      });
      const next = answers.shift();
      if (!next) throw new Error(`Unexpected request to ${url}`);
      if (next instanceof Error) throw next;
      return next;
    }),
  );
  return calls;
}

describe("Zoho CRM client", () => {
  beforeEach(() => {
    resetZohoToken();
    vi.stubEnv("ZOHO_CLIENT_ID", "id");
    vi.stubEnv("ZOHO_CLIENT_SECRET", "secret");
    vi.stubEnv("ZOHO_REFRESH_TOKEN", "refresh");
    vi.stubEnv("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.test");
    vi.stubEnv("ZOHO_API_URL", "https://api.zoho.test/");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does nothing, and asks nothing, until the credentials are set", async () => {
    vi.stubEnv("ZOHO_REFRESH_TOKEN", "");
    const calls = zoho();
    expect(zohoConfigured()).toBe(false);
    expect(await findAdvisor("a@b.test")).toMatchObject({ ok: false, reason: "not_configured" });
    expect(await createLead({ Email: "a@b.test" })).toMatchObject({ ok: false, reason: "not_configured" });
    expect(calls).toHaveLength(0);
  });

  it("refreshes the token once and reuses it", async () => {
    const calls = zoho(token(), noMatch(), noMatch(), noMatch(), noMatch());
    await findAdvisor("a@b.test");
    await findAdvisor("c@d.test");
    expect(calls.filter((c) => c.url.includes("/oauth/v2/token"))).toHaveLength(1);
    expect(calls[0]).toMatchObject({ url: "https://accounts.zoho.test/oauth/v2/token", method: "POST", body: { grant_type: "refresh_token", refresh_token: "refresh" } });
    expect(calls[1].auth).toBe("Zoho-oauthtoken tok-1");
  });

  it("looks in Contacts first, then Leads, and reports an unknown advisor as null", async () => {
    const calls = zoho(token(), noMatch(), noMatch());
    expect(await findAdvisor("Kate@Sunlit.test")).toEqual({ ok: true, data: null });
    expect(calls[1].url).toBe("https://api.zoho.test/crm/v7/Contacts/search?email=kate%40sunlit.test&fields=id,First_Name,Last_Name,Account_Name&per_page=1");
    expect(calls[2].url).toContain("/crm/v7/Leads/search?email=kate%40sunlit.test");
  });

  it("returns a Contact with its account name, without asking Leads", async () => {
    const calls = zoho(token(), json({ data: [{ id: "111", First_Name: "Kate", Last_Name: "Moss", Account_Name: { name: "Sunlit Travel", id: "9" } }] }));
    expect(await findAdvisor("kate@sunlit.test")).toEqual({ ok: true, data: { module: "Contacts", id: "111", firstName: "Kate", lastName: "Moss", company: "Sunlit Travel" } });
    expect(calls).toHaveLength(2);
  });

  it("returns a Lead with its company", async () => {
    zoho(token(), noMatch(), json({ data: [{ id: "222", First_Name: null, Last_Name: "Solo", Company: "Independent" }] }));
    expect(await findAdvisor("sol@x.test")).toEqual({ ok: true, data: { module: "Leads", id: "222", firstName: "", lastName: "Solo", company: "Independent" } });
  });

  it("creates a Lead with a plain insert, never an upsert", async () => {
    const calls = zoho(token(), json({ data: [{ code: "SUCCESS", status: "success", details: { id: "333" } }] }, 201));
    expect(await createLead({ Email: "new@x.test", Last_Name: "New" })).toEqual({ ok: true, data: { id: "333", module: "Leads", created: true, dropped: [] } });
    expect(calls[1]).toMatchObject({ url: "https://api.zoho.test/crm/v7/Leads", method: "POST" });
    expect(calls[1].body).toEqual({ data: [{ Email: "new@x.test", Last_Name: "New" }], trigger: ["workflow"] });
  });

  it("leaves another advisor's Lead alone when the phone is already used, and creates this one without the phone", async () => {
    const clash = { code: "DUPLICATE_DATA", status: "error", message: "duplicate data", details: { api_name: "Phone", duplicate_record: { id: "777", module: { api_name: "Leads" } } } };
    const calls = zoho(token(), json({ data: [clash] }, 400), json({ data: [{ code: "SUCCESS", status: "success", details: { id: "888" } }] }, 201));
    expect(await createLead({ Email: "second@x.test", Last_Name: "Second", Company: "Shared Office", Phone: "+1 305 555 0100" })).toEqual({
      ok: true,
      data: { id: "888", module: "Leads", created: true, dropped: ["Phone"] },
    });
    expect(calls[2].body).toEqual({ data: [{ Email: "second@x.test", Last_Name: "Second", Company: "Shared Office" }], trigger: ["workflow"] });
  });

  it("returns the record Zoho already has for this email, untouched", async () => {
    const clash = { code: "DUPLICATE_DATA", status: "error", message: "duplicate data", details: { api_name: "Email", duplicate_record: { id: "555", module: { api_name: "Contacts" } } } };
    const calls = zoho(token(), json({ data: [clash] }, 400));
    expect(await createLead({ Email: "known@x.test", Last_Name: "Known" })).toEqual({ ok: true, data: { id: "555", module: "Contacts", created: false, dropped: [] } });
    expect(calls).toHaveLength(2);
  });

  it("reports a record Zoho refused, with its reason", async () => {
    zoho(token(), json({ data: [{ code: "MANDATORY_NOT_FOUND", status: "error", message: "required field not found" }] }, 202));
    expect(await createLead({ Email: "x@x.test" })).toMatchObject({ ok: false, reason: "http", message: expect.stringContaining("MANDATORY_NOT_FOUND") });
  });

  it("adds tags without replacing the existing ones", async () => {
    const calls = zoho(token(), json({ data: [{ code: "SUCCESS", status: "success", details: { id: "333" } }] }));
    expect(await addTags("Leads", "333", ["Thanksgiving 2026", "TG26 via email"])).toEqual({ ok: true, data: true });
    expect(calls[1].url).toBe("https://api.zoho.test/crm/v7/Leads/333/actions/add_tags");
    expect(calls[1].body).toEqual({ tags: [{ name: "Thanksgiving 2026" }, { name: "TG26 via email" }], over_write: false });
  });

  it("gets a new token and retries once when Zoho says the token expired", async () => {
    const calls = zoho(token(), json({ code: "INVALID_TOKEN" }, 401), json({ access_token: "tok-2", expires_in: 3600 }), noMatch(), noMatch());
    expect(await findAdvisor("a@b.test")).toEqual({ ok: true, data: null });
    expect(calls[3].auth).toBe("Zoho-oauthtoken tok-2");
  });

  it("never throws: a refused refresh token, an outage and a timeout all come back as results", async () => {
    zoho(json({ error: "invalid_code" }, 400));
    expect(await findAdvisor("a@b.test")).toMatchObject({ ok: false, reason: "auth" });
    resetZohoToken();
    zoho(token(), json({ code: "INTERNAL_ERROR", message: "boom" }, 500));
    expect(await findAdvisor("a@b.test")).toMatchObject({ ok: false, reason: "http", message: expect.stringContaining("500") });
    resetZohoToken();
    zoho(token(), new Error("The operation was aborted due to timeout"));
    expect(await findAdvisor("a@b.test")).toMatchObject({ ok: false, reason: "network" });
  });
});
