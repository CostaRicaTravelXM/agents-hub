import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("mobile app shell: no top bar, five tabs, the More sheet and the course content sheet", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  const tabs = page.getByRole("navigation", { name: "Main" });
  await expect(page.getByRole("banner")).toHaveCount(0);
  for (const label of ["Home", "Learning", "Trips", "Profile"]) {
    await expect(tabs.getByRole("link", { name: label })).toBeVisible();
  }
  const more = tabs.getByRole("button", { name: "More" });
  await expect(more).toBeVisible();
  for (const el of [more, tabs.getByRole("link", { name: "Home" })]) {
    const box = await el.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  await more.click();
  const sheet = page.getByRole("dialog", { name: "More" });
  await expect(sheet).toBeVisible();
  const books = sheet.getByRole("link", { name: /Books/ });
  const tile = await books.boundingBox();
  expect(tile?.height ?? 0).toBeGreaterThanOrEqual(44);
  await books.click();
  await expect(page).toHaveURL(/\/books/);
  await expect(sheet).toBeHidden();

  await tabs.getByRole("link", { name: "Learning" }).click();
  await expect(page.getByRole("heading", { name: "Learn Costa Rica" })).toBeVisible();
  await page.getByRole("navigation", { name: "Learning" }).getByRole("link", { name: "Progress" }).click();
  await expect(page.getByRole("heading", { name: "Progress", exact: true })).toBeVisible();

  await page.goto("/courses/costa-rica-specialist");
  await page.getByRole("link", { name: /Continue learning/ }).click();
  await page.getByRole("button", { name: "Course content" }).click();
  await expect(page.getByRole("dialog", { name: "Course content" })).toBeVisible();
});

test("mobile profile: the tab opens the profile and signing out is there", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("mobile FAM trip: the interest button is visible without scrolling", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  await page.goto("/fam-trips/wellness");
  await expect(page.getByRole("link", { name: /Register interest/ }).first()).toBeInViewport();
});
