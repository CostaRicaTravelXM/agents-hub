import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { adminClient } from "./admin-client";
import { PASSWORD, register, signIn, uniqueEmail } from "./helpers";

/** Next reads the key from here; the tests run outside Next. */
const hasDriveKey = /^GOOGLE_DRIVE_API_KEY=.+/m.test(readFileSync(".env.local", "utf8"));

test("the Hub shell: sidebar, home tiles and the wordmark", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  await expect(page).toHaveURL(/\/dashboard/);
  const nav = page.getByRole("navigation", { name: "Main" }).first();
  for (const label of ["Home", "Learning", "FAM Trips", "Current Offers", "Books", "Marketing Assets", "Profile"]) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByText("Agents Hub").first()).toBeVisible();
  const tiles = page.getByRole("list").filter({ has: page.getByRole("link", { name: /FAM Trips/ }) }).first();
  await expect(tiles.getByRole("link", { name: /Books/ })).toHaveAttribute("href", "/books");
  await expect(tiles.getByRole("link", { name: /Marketing Assets/ })).toHaveAttribute("href", "/marketing");
});

test("FAM trips: list, detail, and the pre-filled interest form", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  await page.goto("/fam-trips");
  await expect(page.getByRole("heading", { name: "FAM Trips" })).toBeVisible();
  const cards = page.getByRole("link", { name: /View trip/ });
  await expect(cards).toHaveCount(13);
  await page.getByRole("link", { name: /Wellness & Transformation/ }).first().click();
  await expect(page.getByRole("heading", { name: /Wellness & Transformation/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "FAM Trips" }).first()).toBeVisible();
  await page.getByRole("link", { name: /Register interest/ }).first().click();
  await expect(page).toHaveURL(/\/fam-trips\/wellness\/interest/);
  const frame = page.locator("iframe");
  await expect(frame).toHaveAttribute("src", /forms\.zohopublic\.com/);
  await expect(frame).toHaveAttribute("src", /Email=agent%40travelxm\.test/);
  await expect(page.getByRole("link", { name: /Open it on its own page/ })).toHaveAttribute("target", "_blank");
});

test("with a Drive key, marketing assets browses the folder inside the Hub", async ({ page }) => {
  test.skip(!hasDriveKey, "Needs GOOGLE_DRIVE_API_KEY");
  await signIn(page, "agent@travelxm.test");
  await page.goto("/marketing");
  const folder = page.locator('main a[href^="/marketing/"]').first();
  const name = (await folder.innerText()).trim();
  await folder.click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByRole("link", { name: "Marketing Assets" }).last()).toHaveAttribute("href", "/marketing");
  // A real Drive id, but not inside the shared folder: nothing is listed.
  await page.goto("/marketing/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs");
  await expect(page.getByRole("heading", { name: "Off the map" })).toBeVisible();
});

test("without a Drive key, marketing assets opens Google Drive in a new tab", async ({ page }) => {
  test.skip(hasDriveKey, "Only without GOOGLE_DRIVE_API_KEY");
  await signIn(page, "agent@travelxm.test");
  await page.goto("/marketing");
  const link = page.getByRole("link", { name: /Marketing assets folder/ });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("href", /drive\.google\.com/);
  await expect(link).toContainText("Opens Google Drive in a new tab");
});

test("empty modules explain themselves", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  await page.goto("/offers");
  await expect(page.getByRole("heading", { name: "Current Offers" })).toBeVisible();
  await page.goto("/books");
  await expect(page.getByRole("heading", { name: "Books" })).toBeVisible();
});

test("registration asks for the agency, and the independent box clears it", async ({ page }) => {
  const email = uniqueEmail("hub");
  await page.goto("/register");
  await page.getByLabel("First name").fill("Indie");
  await page.getByLabel("Last name").fill("Agent");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Academy2026!");
  const agency = page.getByLabel("Agency or company");
  await agency.fill("Sunset Travel");
  await page.getByRole("checkbox", { name: /solo or independent/ }).click();
  await expect(agency).toBeDisabled();
  await expect(agency).toHaveValue("");
  await page.getByRole("checkbox", { name: /solo or independent/ }).click();
  await expect(agency).toBeEnabled();
  await agency.fill("Sunset Travel");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
});

test("a new account lands on Home with its agency saved", async ({ page }) => {
  const email = uniqueEmail("hub-agency");
  await register(page, { name: "Pat Agency", email });
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/profile");
  await expect(page.getByLabel("Agency or company")).toBeVisible();
});

test("anonymous visitors are sent to sign in", async ({ page }) => {
  await page.goto("/fam-trips");
  await expect(page).toHaveURL(/\/login\?next=%2Ffam-trips/);
  await page.goto("/read/anything");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("admin can create and publish an offer agents then see", async ({ page }) => {
  await signIn(page, "admin@travelxm.test");
  await page.goto("/admin/offers/new");
  const title = `E2E offer ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Short description").fill("A test promotion.");
  await page.getByLabel("Status").selectOption("published");
  await page.getByRole("button", { name: "Create offer" }).click();
  await expect(page).toHaveURL(/\/admin\/offers\/[0-9a-f-]{36}/);
  await page.goto("/offers");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(title) }).first().click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});

test("masterclasses live in Learning: old links land on the course list", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  await page.goto("/masterclasses");
  await expect(page).toHaveURL(/\/courses\?category=masterclasses/);
  await expect(page.getByRole("link", { name: /Selling Costa Rica with confidence/ }).first()).toBeVisible();
  await page.goto("/masterclasses/selling-costa-rica-with-confidence");
  await expect(page).toHaveURL(/\/courses\/selling-costa-rica-with-confidence/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Selling Costa Rica/i);
});

test("the Learning tabs stay on the lists and do not cover a course", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  const tabs = page.getByRole("navigation", { name: "Learning" });
  for (const path of ["/courses", "/progress", "/certificates", "/resources"]) {
    await page.goto(path);
    await expect(tabs).toBeVisible();
  }
  await page.goto("/courses/selling-costa-rica-with-confidence");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(tabs).toHaveCount(0);
});

test("a wrong password keeps the email that was typed", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("agent@travelxm.test");
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("agent@travelxm.test");
});

test("an agent who gave their agency in the Portal verification goes straight into the Hub", async ({ page }) => {
  const db = adminClient();
  const email = uniqueEmail("portal");
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: "Pat", last_name: "Lane", full_name: "Pat Lane" },
  });
  expect(error).toBeNull();
  try {
    const { error: saved } = await db.from("agent_verifications").upsert({ user_id: data.user!.id, status: "submitted", answers: { company: "Fora Travel" } });
    expect(saved).toBeNull();
    await signIn(page, email);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto("/profile");
    await expect(page.getByLabel("Agency or company")).toHaveValue("Fora Travel");
  } finally {
    await db.auth.admin.deleteUser(data.user!.id);
  }
});
