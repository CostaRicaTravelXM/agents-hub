import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PASSWORD, uniqueEmail } from "./helpers";

/**
 * The whole journey across both apps: one account, Learning open straight away,
 * the Portal locked until the agent is verified, and the decision coming from
 * Zoho through the webhook. Needs the Portal running on :3001.
 */

const PORTAL = process.env.E2E_PORTAL_URL ?? "http://localhost:3001";
const MAILPIT = "http://127.0.0.1:54324/api/v1";

function webhookSecret() {
  if (process.env.ZOHO_WEBHOOK_SECRET) return process.env.ZOHO_WEBHOOK_SECRET;
  const file = readFileSync(join(process.cwd(), "..", "..", "Agents Portal", ".env.local"), "utf8");
  const match = /^ZOHO_WEBHOOK_SECRET=(.+)$/m.exec(file);
  if (!match) throw new Error("ZOHO_WEBHOOK_SECRET is not set");
  return match[1].trim();
}

async function zohoDecision(body: Record<string, string>, secret = webhookSecret()) {
  return fetch(`${PORTAL}/api/webhooks/zoho/verification`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-webhook-secret": secret },
    body: JSON.stringify(body),
  });
}

async function openConfirmationEmail(page: Page, email: string) {
  const search = `${MAILPIT}/search?query=${encodeURIComponent(`to:"${email}"`)}`;
  await expect
    .poll(async () => ((await (await fetch(search)).json()) as { messages: unknown[] }).messages.length, { timeout: 15_000 })
    .toBeGreaterThan(0);
  const { messages } = (await (await fetch(search)).json()) as { messages: { ID: string }[] };
  const message = (await (await fetch(`${MAILPIT}/message/${messages[0].ID}`)).json()) as { HTML: string };
  const href = /href="([^"]*token_hash[^"]*)"/.exec(message.HTML)?.[1];
  if (!href) throw new Error("No confirmation link in the email");
  await page.goto(href.replaceAll("&amp;", "&"));
}

const continueButton = (page: Page) => page.getByRole("button", { name: "Continue", exact: true });

test("an account signs up, is locked out, verifies and is approved from Zoho", async ({ page }) => {
  const email = uniqueEmail("verify");

  // Account: only name, email and password. Prefilled the way the Hub will link here.
  await page.goto(`${PORTAL}/?signup=1&first_name=Ana&last_name=Mora&email=${encodeURIComponent(email)}`);
  await expect(page.getByLabel("First name")).toHaveValue("Ana");
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await openConfirmationEmail(page, email);
  await page.waitForURL(/\/dashboard/);

  // The account is done, and verification reads as a separate step.
  await expect(page.getByText("Your TravelXM account is ready")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Next: verify that you're a travel agent" })).toBeVisible();

  // Same session in the Hub, with no verification needed. A Portal sign-up has not
  // been asked about an agency yet, so the Hub asks once and then opens.
  await page.goto("http://localhost:3000/dashboard");
  await expect(page).toHaveURL(/localhost:3000\/welcome/);
  await page.getByText(/solo or independent agent/).click();
  await page.locator("form").getByRole("button").last().click();
  await expect(page).toHaveURL(/localhost:3000\/dashboard/);

  // Locked sections send the agent to the form.
  await page.goto(`${PORTAL}/bookings`);
  await page.waitForURL(/\/verification/);
  await expect(page.getByRole("heading", { name: /^Verify that you.re a travel agent$/ })).toBeVisible();

  // Step 1: required, and "Other" asks a follow-up.
  await continueButton(page).click();
  await expect(page.getByText("Choose the option that describes you")).toBeVisible();
  await page.getByRole("radiogroup", { name: "Partner entity type" }).getByText("Other", { exact: true }).click();
  await expect(page.getByLabel("Tell us what describes you")).toBeVisible();
  await page.getByRole("radiogroup", { name: "Partner entity type" }).getByText("Travel Agent under host agency").click();
  await expect(page.getByLabel("Tell us what describes you")).toBeHidden();
  await continueButton(page).click();

  // Step 2.
  await expect(page.getByText("Step 2 of 5")).toBeVisible();
  await continueButton(page).click();
  await expect(page.getByText("Enter your company name")).toBeVisible();
  await page.getByLabel("Your company name").fill("Mora Travel");
  await page.getByRole("radiogroup", { name: /homebased or a storefront/ }).getByText("Homebased").click();
  await page.getByLabel("Travel agency logo").setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.getByRole("button", { name: "Replace logo" })).toBeVisible();
  await continueButton(page).click();

  // Step 3: choosing "under a host agency" already answered yes, and a name is required.
  await expect(page.getByText("Step 3 of 5")).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: /host agency/ }).getByRole("radio", { name: "Yes" })).toBeChecked();
  await page.getByRole("radiogroup", { name: /consortium/ }).getByText("No", { exact: true }).click();
  await continueButton(page).click();
  await expect(page.getByText("Choose your host agency")).toBeVisible();
  await page.getByLabel("Search host agencies").fill("fora");
  await page.getByRole("button", { name: "Fora Travel" }).click();
  await continueButton(page).click();

  // Progress survives leaving the page.
  await expect(page.getByText("Step 4 of 5")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Step 4 of 5")).toBeVisible();
  await page.getByRole("radiogroup", { name: /seller of travel/ }).getByText("Yes", { exact: true }).click();
  await page.getByLabel("License number").fill("CST-123");
  await continueButton(page).click();

  // Step 5: the account email is prefilled and can be changed.
  await expect(page.getByLabel("Your email")).toHaveValue(email);
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByText("Enter your phone number, with country code")).toBeVisible();
  await page.getByLabel("Your phone number").fill("+1 305 555 0100");
  await expect(page.getByRole("region", { name: "Your answers" }).getByText("Fora Travel")).toBeVisible();
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByRole("heading", { name: "We're reviewing your agent details" })).toBeVisible();

  // Still locked while under review.
  await page.goto(`${PORTAL}/customers`);
  await page.waitForURL(/\/verification/);

  // The webhook refuses a wrong secret.
  expect((await zohoDecision({ status: "Approved", email }, "wrong")).status).toBe(401);
  await page.reload();
  await expect(page.getByRole("heading", { name: "We're reviewing your agent details" })).toBeVisible();

  // Our own "Pending Review" write coming back from Zoho changes nothing.
  expect(await (await zohoDecision({ status: "Pending Review", email })).json()).toEqual({ result: "ignored" });

  // Changes requested: the form reopens with the note and can be sent again.
  const changes = await zohoDecision({ status: "Changes Requested", email, note: "Please add your IATA number." });
  expect(await changes.json()).toEqual({ result: "updated" });
  await page.reload();
  await expect(page.getByText("Please add your IATA number.")).toBeVisible();
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByRole("heading", { name: "We're reviewing your agent details" })).toBeVisible();

  // Approved from Zoho: repeated calls are harmless and the Portal opens.
  expect(await (await zohoDecision({ status: "Approved", email })).json()).toEqual({ result: "updated" });
  expect(await (await zohoDecision({ status: "Approved", email })).json()).toEqual({ result: "unchanged" });
  await page.goto(`${PORTAL}/bookings`);
  await expect(page).toHaveURL(/\/bookings/);
  await page.goto(`${PORTAL}/verification`);
  await page.waitForURL(/\/dashboard/);
});
