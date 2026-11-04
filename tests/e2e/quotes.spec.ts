import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { PASSWORD, uniqueEmail } from "./helpers";

/**
 * A quote from request to booking, with the agent and the TravelXM team in separate
 * sessions and the client on a link with no account. Needs the Portal on :3001 and
 * the seeded admin account.
 */

const PORTAL = process.env.E2E_PORTAL_URL ?? "http://localhost:3001";
const SEED_PASSWORD = "Academy2026!";

function portalEnv(name: string): string {
  if (process.env[name]) return process.env[name] as string;
  const file = readFileSync(join(process.cwd(), "..", "..", "Agents Portal", ".env.local"), "utf8");
  const match = new RegExp(`^${name}=(.+)$`, "m").exec(file);
  if (!match) throw new Error(`${name} is not set`);
  return match[1].trim();
}

const SUPABASE = () => portalEnv("NEXT_PUBLIC_SUPABASE_URL");

async function service(path: string, init: RequestInit = {}) {
  const key = portalEnv("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${SUPABASE()}${path}`, {
    ...init,
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=representation", ...init.headers },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function signIn(browser: Browser, email: string, password: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${PORTAL}/`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  return page;
}

async function choose(page: Page, label: string | RegExp, option: string | RegExp) {
  await page.locator("main").getByRole("combobox", { name: label }).or(page.getByRole("dialog").getByRole("combobox", { name: label })).click();
  await page.getByRole("option", { name: option }).click();
}

async function addItem(
  page: Page,
  item: { catalog?: RegExp; kind?: string; title?: string; start: string; end: string; description?: string },
) {
  const form = page.getByRole("form", { name: "Add item" });
  if (item.catalog) await choose(page, /from the catalog/i, item.catalog);
  if (item.kind) await choose(page, "Type", item.kind);
  if (item.title) await form.getByLabel("Title").fill(item.title);
  await form.getByLabel(/^Starts/).fill(item.start);
  await form.getByLabel(/^Ends/).fill(item.end);
  if (item.description) await form.getByLabel("Description").fill(item.description);
  await form.getByRole("button", { name: "Add to itinerary" }).click();
  await expect(page.getByRole("region", { name: "Itinerary draft" }).getByRole("listitem").filter({ hasText: item.title ?? item.catalog }).first()).toBeVisible();
}

let agentId: string;
const catalogName = `E2E Lodge ${Date.now()}`;

test.afterAll(async () => {
  await service(`/rest/v1/catalog_items?name=eq.${encodeURIComponent(catalogName)}`, { method: "DELETE" });
  if (!agentId) return;
  const quotes: { id: number }[] = await service(`/rest/v1/quote_requests?agent_id=eq.${agentId}&select=id`);
  for (const { id } of quotes) await service(`/rest/v1/notifications?href=eq./admin/quotes/${id}`, { method: "DELETE" });
  await service(`/rest/v1/bookings?agent_id=eq.${agentId}`, { method: "DELETE" });
  await service(`/rest/v1/quote_requests?agent_id=eq.${agentId}`, { method: "DELETE" });
  await service(`/rest/v1/customers?agent_id=eq.${agentId}`, { method: "DELETE" });
  await service(`/auth/v1/admin/users/${agentId}`, { method: "DELETE" });
});

test("an agent asks for a quote, TravelXM answers with an itinerary, and accepting it creates the booking", async ({ browser }) => {
  test.setTimeout(240_000);
  const email = uniqueEmail("quote");

  const created = await service("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { first_name: "Quinn", last_name: "Agent", full_name: "Quinn Agent" } }),
  });
  agentId = created.id;
  await service("/rest/v1/agent_verifications", { method: "POST", body: JSON.stringify({ user_id: agentId, status: "approved" }) });
  await service("/rest/v1/customers", {
    method: "POST",
    body: JSON.stringify({ agent_id: agentId, first_name: "Carla", last_name: "Client", email: "carla@example.test" }),
  });

  const agent = await signIn(browser, email, PASSWORD);
  const team = await signIn(browser, "admin@travelxm.test", SEED_PASSWORD);

  // Agents have no way into the team's pages.
  await expect(agent.getByRole("link", { name: "Quote requests" })).toHaveCount(0);
  await agent.goto(`${PORTAL}/admin/quotes`);
  await agent.waitForURL(/\/dashboard/);

  // The team keeps a reusable catalogue.
  await team.goto(`${PORTAL}/admin/catalog`);
  await team.getByRole("button", { name: "Add item" }).click();
  await choose(team, "Type", "Hotel");
  await team.getByLabel("Name").fill(catalogName);
  await team.getByLabel("Location").fill("La Fortuna");
  await team.getByLabel("Description").fill("Rooms with a view of the volcano.");
  await team.getByRole("button", { name: "Save" }).click();
  await expect(team.getByText(catalogName)).toBeVisible();

  // The agent asks.
  await agent.goto(`${PORTAL}/quotes/new`);
  await choose(agent, "Client", "Carla Client");
  await agent.getByLabel("Destination").fill("E2E Costa Rica");
  await agent.getByLabel("Start date").fill("2027-03-08");
  await agent.getByLabel("End date").fill("2027-03-12");
  await agent.getByLabel("Travelers").fill("2");
  await agent.getByLabel(/What should we know/).fill("Second honeymoon, loves hiking.");
  await agent.getByRole("button", { name: "Send to TravelXM" }).click();
  await agent.waitForURL(/\/quotes\/\d+$/);
  await expect(agent.getByText("TravelXM is preparing your itinerary")).toBeVisible();
  const quoteId = /\/quotes\/(\d+)$/.exec(agent.url())?.[1];

  // Both sides talk, and each message arrives without a reload.
  await team.goto(`${PORTAL}/admin/quotes/${quoteId}`);
  await expect(team.getByText("Second honeymoon, loves hiking.")).toBeVisible();
  await agent.waitForTimeout(1500);
  await team.getByLabel("Write a message").fill("Do they prefer rainforest or beach?");
  await team.getByRole("button", { name: "Send message" }).click();
  await expect(agent.getByText("Do they prefer rainforest or beach?")).toBeVisible({ timeout: 15_000 });
  await agent.getByLabel("Write a message").fill("Rainforest, please.");
  await agent.getByRole("button", { name: "Send message" }).click();
  await expect(team.getByText("Rainforest, please.")).toBeVisible({ timeout: 15_000 });

  // The team builds a draft from the catalogue and free items. The agent sees none of it.
  await team.getByRole("button", { name: "Start the itinerary" }).click();
  await expect(team.getByRole("region", { name: "Itinerary draft" })).toBeVisible();
  await addItem(team, { catalog: new RegExp(catalogName), start: "2027-03-08T15:00", end: "2027-03-12T11:00" });
  await addItem(team, { kind: "Tour", title: "Arenal volcano hike", start: "2027-03-09T09:00", end: "2027-03-09T12:00", description: "A guided walk over old lava fields." });
  await addItem(team, { kind: "Tour", title: "Night walk", start: "2027-03-09T10:00", end: "2027-03-09T13:00" });
  await addItem(team, { kind: "Transport", title: "Private transfer from SJO", start: "2027-03-08T11:00", end: "2027-03-08T14:30" });
  await agent.reload();
  await expect(agent.getByText("Arenal volcano hike")).toHaveCount(0);

  // Sending needs a price.
  await team.getByRole("button", { name: "Send to the agent" }).click();
  await expect(team.getByText("Set the total price and the commission rate.")).toBeVisible();
  await team.getByLabel("Total price (USD)").fill("5000");
  await team.getByLabel("Agent commission (%)").fill("12");
  await team.getByLabel(/Summary for the agent/).fill("Five days around the volcano.");
  await team.getByRole("button", { name: "Send to the agent" }).click();
  await expect(team.getByRole("heading", { name: "Sent to the agent: version 1" })).toBeVisible();

  // The proposal appears for the agent without a reload: weekly grid, details on click, money.
  await expect(agent.getByRole("heading", { name: "Proposal, version 1" })).toBeVisible({ timeout: 15_000 });
  await expect(agent.getByText("Week 1 of 1")).toBeVisible();
  await expect(agent.getByText("$5,000", { exact: true })).toBeVisible();
  await expect(agent.getByText("$600", { exact: true })).toBeVisible();
  await agent.getByRole("button", { name: /^Tour: Arenal volcano hike/ }).click();
  await expect(agent.getByRole("dialog").getByText("A guided walk over old lava fields.")).toBeVisible();
  await agent.keyboard.press("Escape");
  await agent.getByRole("button", { name: new RegExp(`^Hotel: ${catalogName}`) }).click();
  await expect(agent.getByRole("dialog").getByText("Rooms with a view of the volcano.")).toBeVisible();
  await agent.keyboard.press("Escape");
  await expect(agent.getByRole("dialog")).toHaveCount(0);

  // Items at the same time sit side by side rather than on top of each other.
  const hike = await agent.getByRole("button", { name: /^Tour: Arenal volcano hike/ }).boundingBox();
  const walk = await agent.getByRole("button", { name: /^Tour: Night walk/ }).boundingBox();
  expect((hike?.x ?? 0) + (hike?.width ?? 0)).toBeLessThanOrEqual((walk?.x ?? 0) + 1);

  // The client link has no commission, and no price until the agent shows it.
  await agent.getByRole("button", { name: "Create a link" }).click();
  const linkField = agent.getByRole("textbox", { name: "Client link" });
  await expect(linkField).toHaveValue(/\/trip\/[0-9a-f]{64}$/);
  const tripUrl = await linkField.inputValue();

  const client = await (await browser.newContext({ viewport: { width: 375, height: 760 } })).newPage();
  await client.goto(tripUrl);
  await expect(client.getByRole("heading", { name: "E2E Costa Rica" })).toBeVisible();
  await expect(client.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(client.getByRole("button", { name: /Arenal volcano hike/ })).toBeVisible();
  const clientText = await client.locator("main").innerText();
  expect(clientText).not.toMatch(/commission|\$|honeymoon/i);
  expect(await client.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await client.getByRole("button", { name: /Arenal volcano hike/ }).click();
  await expect(client.getByRole("dialog").getByText("A guided walk over old lava fields.")).toBeVisible();
  await client.keyboard.press("Escape");

  await agent.getByLabel("Show the total price").click();
  await expect(async () => {
    await client.reload();
    await expect(client.getByText("$5,000")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });

  // The agent asks for changes, and the team sends a second version.
  await agent.getByRole("button", { name: "Ask for changes" }).click();
  await agent.getByRole("textbox", { name: "What should we change?" }).fill("Add the hot springs.");
  await agent.getByRole("button", { name: "Send changes" }).click();
  await expect(agent.getByText("TravelXM is working on your changes")).toBeVisible();
  await expect(agent.getByRole("button", { name: "Accept" })).toHaveCount(0);

  await expect(team.getByText("Add the hot springs.")).toBeVisible({ timeout: 15_000 });
  await team.getByRole("button", { name: "Start version 2" }).click();
  await expect(team.getByRole("heading", { name: "Draft, version 2" })).toBeVisible();
  await addItem(team, { kind: "Tour", title: "Hot springs evening", start: "2027-03-10T17:00", end: "2027-03-10T20:00" });
  await team.getByLabel("Total price (USD)").fill("6000");
  await team.getByLabel("Agent commission (%)").fill("15");
  await team.getByRole("button", { name: "Send to the agent" }).click();

  await expect(agent.getByRole("heading", { name: "Proposal, version 2" })).toBeVisible({ timeout: 15_000 });
  await client.reload();
  await expect(client.getByRole("button", { name: /Hot springs evening/ })).toBeVisible();

  // Accepting creates the booking with the server's money and the itinerary's dates.
  await agent.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(agent.getByRole("dialog")).toContainText("$900");
  await agent.getByRole("button", { name: "Accept and create booking" }).click();
  await agent.waitForURL(/\/bookings$/);
  await expect(agent.getByText("Custom itinerary").first()).toBeVisible();

  const [booking] = await service(`/rest/v1/bookings?agent_id=eq.${agentId}&select=total_amount,commission_rate,start_date,end_date,package_id,status`);
  expect(booking).toMatchObject({ total_amount: 6000, commission_rate: 15, start_date: "2027-03-08", end_date: "2027-03-12", package_id: null, status: "pending" });
  const [commission] = await service(`/rest/v1/commissions?agent_id=eq.${agentId}&select=amount`);
  expect(commission.amount).toBe(900);

  // The quote is closed for the team too, and the agent can still turn off the client link.
  await team.goto(`${PORTAL}/admin/quotes/${quoteId}`);
  await expect(team.getByRole("button", { name: /Start version/ })).toHaveCount(0);
  await agent.goto(`${PORTAL}/quotes/${quoteId}`);
  await expect(agent.getByText("You accepted this itinerary.")).toBeVisible();
  await agent.getByRole("button", { name: "Turn off the link" }).click();
  await expect(agent.getByRole("button", { name: "Create a link" })).toBeVisible();
  await client.reload();
  await expect(client.getByRole("heading", { name: /This link isn.t active/ })).toBeVisible();
});
