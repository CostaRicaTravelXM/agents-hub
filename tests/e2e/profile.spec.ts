import { expect, test } from "@playwright/test";
import { register, uniqueEmail } from "./helpers";

test("saving the profile updates the whole page without a reload", async ({ page }) => {
  await register(page, { name: "Before Rename", email: uniqueEmail("profile") });
  await page.goto("/profile");

  const stamp = Date.now().toString().slice(-5);
  const name = `Renamed Person${stamp}`;
  const agency = `Agency ${stamp}`;
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel(/Agency/).first().fill(agency);
  await page.getByLabel("Job title").fill("Owner");
  await page.getByLabel("Country").selectOption("Canada");
  await page.getByLabel("Phone").fill("+1 555 000 1111");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();

  // The summary card, the shell and the form itself all show the saved values.
  await expect(page.locator("#main").getByText(name, { exact: true }).first()).toBeVisible();
  await expect(page.locator("#main").getByText(agency).first()).toBeVisible();
  await expect(page.locator("#main").getByText(/Canada/).first()).toBeVisible();
  await expect(page.getByRole("complementary").getByText(name)).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue(name);
  await expect(page.getByLabel(/Agency/).first()).toHaveValue(agency);
  await expect(page.getByLabel("Job title")).toHaveValue("Owner");
  await expect(page.getByLabel("Country")).toHaveValue("Canada");
  await expect(page.getByLabel("Phone")).toHaveValue("+1 555 000 1111");

  // A second change works from those values: nothing is lost or reset.
  await page.getByLabel("Job title").fill("Advisor");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByLabel("Job title")).toHaveValue("Advisor");
  await expect(page.getByLabel("Country")).toHaveValue("Canada");
  await page.waitForTimeout(800);
  await expect(page.getByLabel("Country")).toHaveValue("Canada");
  await expect(page.getByLabel(/Agency/).first()).toHaveValue(agency);

  // A mistake keeps what was typed, so nothing has to be entered again.
  await page.getByLabel("Job title").fill("Typed before the mistake");
  await page.getByLabel("Phone").fill("not a phone");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Use digits, spaces and + only")).toBeVisible();
  await expect(page.getByLabel("Job title")).toHaveValue("Typed before the mistake");
  await expect(page.getByLabel("Country")).toHaveValue("Canada");
  await page.getByLabel("Phone").fill("+1 555 000 1111");
  await page.getByLabel("Job title").fill("Advisor");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Use digits, spaces and + only")).toBeHidden();

  // Moving around the app shows the new name too.
  await page.getByRole("complementary").getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Renamed");
  await page.getByRole("complementary").getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page.getByLabel("Job title")).toHaveValue("Advisor");
  await expect(page.getByLabel("Country")).toHaveValue("Canada");
});
