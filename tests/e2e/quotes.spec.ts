import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { PASSWORD, uniqueEmail } from "./helpers";

/**
 * Quotes from request to booking, with the agent and the TravelXM team in separate
 * sessions and the client on a link with no account, plus the admin's screens. Needs
 * the Portal on :3001 and the seeded admin account.
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

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Opens the one-field calendar, moves to each month and clicks the first and last day. */
async function pickDates(page: Page, trigger: Locator, from: string, to: string) {
  await trigger.click();
  const calendar = page.locator("[data-radix-popper-content-wrapper]");
  for (const iso of [from, to]) {
    const [year, month, day] = iso.split("-").map(Number);
    const name = new RegExp(`${MONTHS[month - 1]} ${day}(st|nd|rd|th), ${year}`);
    for (let tries = 0; tries < 24 && !(await calendar.getByRole("button", { name }).isVisible()); tries++) {
      await calendar.getByRole("button", { name: /next month/i }).click();
    }
    await calendar.getByRole("button", { name }).click();
  }
  await expect(calendar).toHaveCount(0);
}

const PDF = { name: "Volcano itinerary.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n") };
const PNG = {
  name: "volcano.png",
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"),
};

async function fillOption(
  page: Page,
  number: number,
  option: { title?: string; from?: string; to?: string; summary?: string; price?: string; rate?: string; files?: (typeof PDF)[] },
) {
  const form = page.getByRole("region", { name: `Option ${number}` });
  if (option.title) await form.getByLabel("Title of the tour").fill(option.title);
  if (option.from && option.to) await pickDates(page, form.getByRole("button", { name: /^Dates/ }), option.from, option.to);
  if (option.summary) await form.getByLabel(/Summary for the agent/).fill(option.summary);
  if (option.price) await form.getByLabel("Total price (USD)").fill(option.price);
  if (option.rate) await form.getByLabel("Agent commission (%)").fill(option.rate);
  for (const upload of option.files ?? []) {
    await form.locator('input[type="file"]').setInputFiles(upload);
    await expect(form.getByText(upload.name)).toBeVisible({ timeout: 15_000 });
  }
}

const agentIds: string[] = [];
const quoteFileFolders: string[] = [];
const packageName = `E2E Package ${Date.now()}`;

async function createAgent(prefix: string, first: string, client: string) {
  const email = uniqueEmail(prefix);
  const created = await service("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { first_name: first, last_name: "Agent", full_name: `${first} Agent` } }),
  });
  agentIds.push(created.id);
  await service("/rest/v1/agent_verifications", { method: "POST", body: JSON.stringify({ user_id: created.id, status: "approved" }) });
  const [firstName, lastName] = client.split(" ");
  await service("/rest/v1/customers", {
    method: "POST",
    body: JSON.stringify({ agent_id: created.id, first_name: firstName, last_name: lastName, email: `${firstName.toLowerCase()}@example.test` }),
  });
  return { id: created.id as string, email };
}

test.afterAll(async () => {
  for (const folder of quoteFileFolders) {
    const files: { name: string }[] = await service("/storage/v1/object/list/quote-files", { method: "POST", body: JSON.stringify({ prefix: folder, limit: 100 }) });
    if (files.length > 0) {
      await service("/storage/v1/object/quote-files", { method: "DELETE", body: JSON.stringify({ prefixes: files.map((f) => `${folder}/${f.name}`) }) });
    }
  }
  for (const agentId of agentIds) {
    const quotes: { id: number }[] = await service(`/rest/v1/quote_requests?agent_id=eq.${agentId}&select=id`);
    for (const { id } of quotes) await service(`/rest/v1/notifications?href=eq./admin/quotes/${id}`, { method: "DELETE" });
    await service(`/rest/v1/bookings?agent_id=eq.${agentId}`, { method: "DELETE" });
    await service(`/rest/v1/quote_requests?agent_id=eq.${agentId}`, { method: "DELETE" });
    await service(`/rest/v1/customers?agent_id=eq.${agentId}`, { method: "DELETE" });
    await service(`/auth/v1/admin/users/${agentId}`, { method: "DELETE" });
  }
  // Last, because a booking left by a failed run still points at the package.
  await service(`/rest/v1/packages?name=eq.${encodeURIComponent(packageName)}`, { method: "DELETE" });
});

test("an agent asks for a quote, TravelXM answers with option cards, and accepting one creates the booking", async ({ browser }) => {
  test.setTimeout(300_000);
  const { id: agentId, email } = await createAgent("quote", "Quinn", "Carla Client");

  const agent = await signIn(browser, email, PASSWORD);
  const team = await signIn(browser, "admin@travelxm.test", SEED_PASSWORD);

  // Agents have no way into the team's pages.
  await expect(agent.getByRole("link", { name: "Quote requests" })).toHaveCount(0);
  await agent.goto(`${PORTAL}/admin/quotes`);
  await agent.waitForURL(/\/dashboard/);
  await agent.goto(`${PORTAL}/admin/bookings`);
  await agent.waitForURL(/\/dashboard/);

  // The agent asks without a destination, with one field for dates across two months.
  await agent.goto(`${PORTAL}/quotes/new`);
  await choose(agent, "Client", "Carla Client");
  await agent.getByLabel("Travelers").fill("2");
  await agent.getByLabel(/What should we know/).fill("Second honeymoon, loves hiking.");
  await agent.getByRole("button", { name: "Send to TravelXM" }).click();
  await expect(agent.getByText("Choose the first and last day of the trip")).toBeVisible();
  await pickDates(agent, agent.getByRole("button", { name: /^Travel dates/ }), "2027-03-28", "2027-04-03");
  await expect(agent.getByRole("button", { name: /^Travel dates/ })).toContainText("Mar 28 – Apr 3, 2027");
  await agent.getByRole("button", { name: "Send to TravelXM" }).click();
  await agent.waitForURL(/\/quotes\/\d+$/);
  await expect(agent.getByRole("heading", { name: "Destination open" })).toBeVisible();
  await expect(agent.getByText("TravelXM is preparing your options")).toBeVisible();
  const quoteId = /\/quotes\/(\d+)$/.exec(agent.url())?.[1] as string;
  quoteFileFolders.push(quoteId);

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

  // The admin fills in the destination once it's agreed.
  await team.getByRole("button", { name: "Edit request" }).click();
  await team.getByRole("dialog").getByLabel(/Destination/).fill("E2E Costa Rica");
  await team.getByRole("button", { name: "Save changes" }).click();
  await expect(team.getByRole("heading", { name: "E2E Costa Rica" })).toBeVisible();

  // The form has no item-by-item schedule any more.
  await team.getByRole("button", { name: "Start the proposal" }).click();
  await expect(team.getByRole("region", { name: "Proposal draft" })).toBeVisible();
  await expect(team.getByLabel("Description")).toHaveCount(0);
  await expect(team.getByText(/one per line/)).toHaveCount(0);
  await expect(team.getByLabel(/Starts/)).toHaveCount(0);

  // Two options, one saved half finished. The agent sees none of it.
  await fillOption(team, 1, {
    title: "Arenal volcano week",
    summary: "Seven days around the volcano.",
    price: "5000",
    rate: "12",
    files: [PDF, PNG],
  });
  await team.getByRole("button", { name: "Add another option" }).click();
  await fillOption(team, 2, { title: "Pacific coast week", from: "2027-03-29", to: "2027-04-02" });
  await expect(team.getByRole("button", { name: "Send 2 options to the agent" })).toBeVisible();
  await team.getByRole("button", { name: "Save draft" }).click();
  await expect(team.getByText("Draft saved").first()).toBeVisible();

  await team.reload();
  await expect(team.getByRole("region", { name: "Option 2" }).getByLabel("Title of the tour")).toHaveValue("Pacific coast week");
  await expect(team.getByRole("region", { name: "Option 1" }).getByText(PDF.name)).toBeVisible();
  await agent.reload();
  await expect(agent.getByText("Arenal volcano week")).toHaveCount(0);

  // Nothing goes out until every option is complete.
  await team.getByRole("button", { name: "Send 2 options to the agent" }).click();
  await expect(team.getByText("Option 2 needs a total price.")).toBeVisible();
  await agent.reload();
  await expect(agent.getByText("Arenal volcano week")).toHaveCount(0);
  await fillOption(team, 2, { price: "4000", rate: "10", summary: "Beaches and sunsets." });
  await agent.waitForTimeout(1000);
  await team.getByRole("button", { name: "Send 2 options to the agent" }).click();
  await expect(team.getByRole("heading", { name: "Sent to the agent: version 1" })).toBeVisible();

  // The agent gets both cards together, without a reload.
  await expect(agent.getByRole("heading", { name: "Your 2 options" })).toBeVisible({ timeout: 15_000 });
  const volcano = agent.getByRole("article", { name: "Arenal volcano week" });
  const coast = agent.getByRole("article", { name: "Pacific coast week" });
  await expect(volcano).toContainText("$5,000");
  await expect(volcano).toContainText("Commission (12%)");
  await expect(volcano).toContainText("$600");
  await expect(volcano).toContainText("Seven days around the volcano.");
  await expect(volcano.getByRole("img")).toBeVisible();
  await expect(coast).toContainText("$4,000");
  await expect(coast).toContainText("$400");

  // Files are private: the card's link works, and the bare address doesn't.
  const pdfLink = volcano.getByRole("link", { name: PDF.name });
  const pdfUrl = (await pdfLink.getAttribute("href")) as string;
  const pdfResponse = await fetch(pdfUrl);
  expect(pdfResponse.status).toBe(200);
  expect(pdfResponse.headers.get("content-type")).toContain("application/pdf");
  const bareUrl = pdfUrl.split("?")[0].replace("/object/sign/", "/object/public/");
  expect((await fetch(bareUrl)).status).toBeGreaterThanOrEqual(400);

  // The client link has every option, no commission, and no price until the agent shows it.
  await agent.getByRole("button", { name: "Create a link" }).click();
  const linkField = agent.getByRole("textbox", { name: "Client link" });
  await expect(linkField).toHaveValue(/\/trip\/[0-9a-f]{64}$/);
  const tripUrl = await linkField.inputValue();

  const client = await (await browser.newContext({ viewport: { width: 375, height: 760 } })).newPage();
  await client.goto(tripUrl);
  await expect(client.getByRole("heading", { name: "E2E Costa Rica" })).toBeVisible();
  await expect(client.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(client.getByRole("article")).toHaveCount(2);
  await expect(client.getByRole("article", { name: "Arenal volcano week" }).getByRole("link", { name: PDF.name })).toBeVisible();
  const clientText = await client.locator("main").innerText();
  expect(clientText).not.toMatch(/commission|\$|honeymoon/i);
  expect(await client.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

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
  await expect(agent.getByRole("button", { name: /^Accept/ })).toHaveCount(0);

  await expect(team.getByText("Add the hot springs.")).toBeVisible({ timeout: 15_000 });
  await team.getByRole("button", { name: "Start version 2" }).click();
  await expect(team.getByRole("heading", { name: "Draft, version 2" })).toBeVisible();
  await expect(team.getByRole("region", { name: "Option 1" }).getByText(PDF.name)).toBeVisible();
  await fillOption(team, 1, { price: "6000", rate: "15", from: "2027-03-28", to: "2027-04-03" });
  await team.getByRole("button", { name: "Add another option" }).click();
  await fillOption(team, 3, { title: "Osa Peninsula week", from: "2027-03-28", to: "2027-04-02", price: "7000", rate: "10" });
  await team.getByRole("button", { name: "Send 3 options to the agent" }).click();

  await expect(agent.getByRole("heading", { name: "Your 3 options" })).toBeVisible({ timeout: 15_000 });
  await client.reload();
  await expect(client.getByRole("article")).toHaveCount(3);

  // Accepting one option creates the booking with that option's money and dates.
  await agent.getByRole("button", { name: "Accept Arenal volcano week" }).click();
  await expect(agent.getByRole("dialog")).toContainText("$900");
  await agent.getByRole("button", { name: "Accept and create booking" }).click();
  await agent.waitForURL(/\/bookings$/);
  await expect(agent.getByText("Arenal volcano week").first()).toBeVisible();

  // From the booking, the destination opens the quote, and the quote links back.
  await agent.locator("main").getByRole("link", { name: "E2E Costa Rica" }).first().click();
  await agent.waitForURL(new RegExp(`/quotes/${quoteId}$`));
  await expect(agent.getByRole("article", { name: "Arenal volcano week" })).toContainText("Accepted");
  await agent.getByRole("link", { name: /See booking #/ }).click();
  await agent.waitForURL(/\/bookings\?q=\d+$/);
  await expect(agent.locator("main").getByRole("link", { name: "E2E Costa Rica" }).first()).toBeVisible();

  const [booking] = await service(`/rest/v1/bookings?agent_id=eq.${agentId}&select=total_amount,commission_rate,start_date,end_date,package_id,status`);
  expect(booking).toMatchObject({ total_amount: 6000, commission_rate: 15, start_date: "2027-03-28", end_date: "2027-04-03", package_id: null, status: "pending" });
  const [commission] = await service(`/rest/v1/commissions?agent_id=eq.${agentId}&select=amount`);
  expect(commission.amount).toBe(900);

  // The client now sees just the chosen trip.
  await client.reload();
  await expect(client.getByRole("article")).toHaveCount(1);
  await expect(client.getByRole("article", { name: "Arenal volcano week" })).toBeVisible();

  // The quote is closed for the team too, and the agent can still turn off the client link.
  await team.goto(`${PORTAL}/admin/quotes/${quoteId}`);
  await expect(team.getByRole("button", { name: /Start version/ })).toHaveCount(0);
  await agent.goto(`${PORTAL}/quotes/${quoteId}`);
  await expect(agent.getByText("You accepted Arenal volcano week.")).toBeVisible();
  await agent.getByRole("button", { name: "Turn off the link" }).click();
  await expect(agent.getByRole("button", { name: "Create a link" })).toBeVisible();
  await client.reload();
  await expect(client.getByRole("heading", { name: /This link isn.t active/ })).toBeVisible();
});

test("an admin can create, edit and delete quotes, packages and bookings for anyone", async ({ browser }) => {
  test.setTimeout(240_000);
  const { id: agentId, email } = await createAgent("crud", "Rosa", "Dana Client");
  const agent = await signIn(browser, email, PASSWORD);
  const admin = await signIn(browser, "admin@travelxm.test", SEED_PASSWORD);

  await expect(agent.getByRole("link", { name: "Manage packages" })).toHaveCount(0);
  await agent.goto(`${PORTAL}/admin/packages`);
  await agent.waitForURL(/\/dashboard/);

  // A package, with its schedule, reaches agents as soon as it's saved.
  await admin.goto(`${PORTAL}/packages`);
  await admin.locator("main").getByRole("link", { name: "Manage packages" }).click();
  await admin.getByRole("link", { name: "Add package" }).click();
  await admin.getByRole("button", { name: "Add package" }).click();
  await expect(admin.getByText("Enter a name")).toBeVisible();

  await admin.getByLabel("Name", { exact: true }).fill(packageName);
  await admin.getByLabel("Destination").fill("Monteverde, Costa Rica");
  await admin.getByLabel("Description").fill("Cloud forest walks.");
  await admin.getByLabel("Price per person (USD)").fill("1000");
  await admin.getByLabel("Days", { exact: true }).fill("3");
  await admin.getByLabel("Agent commission (%)").fill("10");
  await admin.getByRole("checkbox", { name: "Wildlife & nature" }).click();
  await admin.getByLabel("Highlights, one per line").fill("Hanging bridges\nNight walk");
  await admin.locator('input[type="file"][aria-label="Upload photo"]').setInputFiles(PNG);
  await expect(admin.getByRole("button", { name: "Replace photo" })).toBeVisible({ timeout: 15_000 });

  await admin.getByRole("button", { name: "Add to the schedule" }).click();
  const stop = admin.getByRole("dialog");
  await stop.getByLabel("Title").fill("Hanging bridges walk");
  await stop.getByLabel("Starts on day").fill("2");
  await stop.getByLabel("Ends on day").fill("2");
  await stop.getByLabel("Description").fill("High in the canopy.");
  await stop.getByRole("button", { name: "Add to schedule" }).click();
  await expect(admin.getByRole("button", { name: "Edit Hanging bridges walk" })).toBeVisible();
  await admin.getByRole("button", { name: "Add package" }).click();
  await admin.waitForURL(/\/admin\/packages$/);

  const [created] = await service(`/rest/v1/packages?name=eq.${encodeURIComponent(packageName)}&select=id`);
  await agent.goto(`${PORTAL}/packages/${created.id}`);
  await expect(agent.getByRole("heading", { name: packageName })).toBeVisible();
  await expect(agent.getByRole("link", { name: "Edit package" })).toHaveCount(0);
  await agent.getByRole("button", { name: /^Tour: Hanging bridges walk, Day 2/ }).click();
  await expect(agent.getByRole("dialog")).toContainText("High in the canopy.");
  await agent.keyboard.press("Escape");

  // Editing shows up for agents, and hiding takes it away.
  await admin.getByRole("link", { name: `Edit ${packageName}` }).click();
  await admin.waitForURL(new RegExp(`/admin/packages/${created.id}$`));
  await expect(admin.getByRole("button", { name: "Edit Hanging bridges walk" })).toBeVisible();
  await admin.getByLabel("Price per person (USD)").fill("1200");
  await admin.getByRole("button", { name: "Save package" }).click();
  await admin.waitForURL(/\/admin\/packages$/);
  const [edited] = await service(`/rest/v1/packages?id=eq.${created.id}&select=price_per_person,schedule`);
  expect(edited.price_per_person).toBe(1200);
  expect(edited.schedule[0]).toMatchObject({ title: "Hanging bridges walk", startDay: 2, endDay: 2 });

  await admin.getByRole("button", { name: `Hide ${packageName}` }).click();
  await expect(admin.getByRole("button", { name: `Show ${packageName}` })).toBeVisible();
  await agent.goto(`${PORTAL}/packages`);
  await expect(agent.getByText(packageName)).toHaveCount(0);
  await admin.getByRole("button", { name: `Show ${packageName}` }).click();
  await expect(admin.getByRole("button", { name: `Hide ${packageName}` })).toBeVisible();

  // A booking on the agent's behalf, with the package's price as a starting point.
  await admin.goto(`${PORTAL}/admin/bookings`);
  await admin.getByRole("button", { name: "New booking" }).click();
  let dialog = admin.getByRole("dialog");
  await choose(admin, "Agent", /Rosa Agent/);
  await choose(admin, "Client", "Dana Client");
  await pickDates(admin, dialog.getByRole("button", { name: /^Travel dates/ }), "2027-02-27", "2027-03-01");
  await choose(admin, "Package", packageName);
  await expect(dialog.getByLabel("Total (USD)")).toHaveValue("2400");
  await dialog.getByRole("button", { name: "Create booking" }).click();
  await expect(dialog).toHaveCount(0);

  await agent.goto(`${PORTAL}/bookings`);
  await expect(agent.getByText(packageName).first()).toBeVisible();
  const [booking] = await service(`/rest/v1/bookings?agent_id=eq.${agentId}&select=id`);

  // Correcting the money corrects the commission.
  await admin.getByLabel("Search bookings", { exact: true }).fill(`#${booking.id}`);
  await admin.getByRole("button", { name: `Edit booking #${booking.id}` }).click();
  dialog = admin.getByRole("dialog");
  await dialog.getByLabel("Total (USD)").fill("3000");
  await choose(admin, "Status", "Confirmed");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toHaveCount(0);
  const [commission] = await service(`/rest/v1/commissions?booking_id=eq.${booking.id}&select=amount`);
  expect(commission.amount).toBe(300);

  // A package with bookings can't be deleted, only hidden.
  await admin.goto(`${PORTAL}/admin/packages`);
  await admin.getByRole("button", { name: `Delete ${packageName}` }).click();
  await admin.getByRole("button", { name: "Delete package" }).click();
  await expect(admin.getByText("This package has bookings, so it can't be deleted. Hide it instead.")).toBeVisible();
  await admin.getByRole("button", { name: "Keep it" }).click();

  await admin.goto(`${PORTAL}/admin/bookings`);
  await admin.getByLabel("Search bookings", { exact: true }).fill(`#${booking.id}`);
  await admin.getByRole("button", { name: `Delete booking #${booking.id}` }).click();
  await admin.getByRole("button", { name: "Delete booking" }).click();
  // The row counts as gone while the pop-up hides the page, so wait for the pop-up first.
  await expect(admin.getByRole("dialog")).toHaveCount(0);
  await expect(admin.getByRole("button", { name: `Delete booking #${booking.id}` })).toHaveCount(0);
  expect(await service(`/rest/v1/commissions?booking_id=eq.${booking.id}&select=id`)).toEqual([]);

  await admin.goto(`${PORTAL}/admin/packages`);
  await admin.getByRole("button", { name: `Delete ${packageName}` }).click();
  await admin.getByRole("button", { name: "Delete package" }).click();
  await expect(admin.getByRole("dialog")).toHaveCount(0);
  await expect(admin.getByRole("link", { name: packageName })).toHaveCount(0);

  // A quote opened for the agent, then deleted.
  await admin.goto(`${PORTAL}/admin/quotes`);
  await admin.getByRole("button", { name: "New quote" }).click();
  dialog = admin.getByRole("dialog");
  await choose(admin, "Agent", /Rosa Agent/);
  await choose(admin, "Client", "Dana Client");
  await pickDates(admin, dialog.getByRole("button", { name: /^Travel dates/ }), "2027-02-10", "2027-03-05");
  await dialog.getByRole("button", { name: "Create quote" }).click();
  await admin.waitForURL(/\/admin\/quotes\/\d+$/);
  const openedId = /\/quotes\/(\d+)$/.exec(admin.url())?.[1];

  await agent.goto(`${PORTAL}/quotes/${openedId}`);
  await expect(agent.getByRole("heading", { name: "Destination open" })).toBeVisible();

  await admin.getByRole("button", { name: "Delete", exact: true }).click();
  await admin.getByRole("button", { name: "Delete quote" }).click();
  await admin.waitForURL(/\/admin\/quotes$/);
  expect(await service(`/rest/v1/quote_requests?id=eq.${openedId}&select=id`)).toEqual([]);
});

test("every package is in Costa Rica and shows its schedule, with details in a centered pop-up", async ({ browser }) => {
  const page = await signIn(browser, "agent@travelxm.test", SEED_PASSWORD);

  const packages: { destination: string; schedule: unknown[]; duration_days: number }[] = await service("/rest/v1/packages?select=destination,schedule,duration_days&is_active=eq.true");
  expect(packages.length).toBeGreaterThan(0);
  for (const pkg of packages) expect(pkg.schedule.length).toBeGreaterThan(0);

  await page.goto(`${PORTAL}/packages/1`);
  await expect(page.getByRole("heading", { name: "Trip schedule" })).toBeVisible();
  await expect(page.getByText("Week 1 of 2")).toBeVisible();

  // A trip day, not a date.
  const hike = page.getByRole("button", { name: /^Tour: Arenal Volcano National Park hike, Day 2/ });
  await hike.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Arenal Volcano National Park hike" })).toBeVisible();
  await expect(dialog).toContainText("Day 2, 8:00 AM – 11:30 AM");

  // Polled because the pop-up slides into place.
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("no viewport");
  await expect(async () => {
    const box = await dialog.boundingBox();
    if (!box) throw new Error("no pop-up");
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
    expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(2);
  }).toPass({ timeout: 3000 });

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  // The second week holds the rest of the trip, and only days of the trip.
  await page.getByRole("button", { name: "Next week" }).click();
  await expect(page.getByText("Week 2 of 2")).toBeVisible();
  await expect(page.getByRole("button", { name: /to San José airport, Day 8/ })).toBeVisible();
});
