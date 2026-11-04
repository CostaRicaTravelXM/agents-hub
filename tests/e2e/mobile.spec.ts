import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("mobile app shell: bottom tabs and syllabus sheet", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  const tabs = page.getByRole("navigation", { name: "Main" });
  await expect(tabs.getByRole("link", { name: "Home" })).toBeVisible();
  await tabs.getByRole("link", { name: "Progress" }).click();
  await expect(page.getByRole("heading", { name: "Progress", exact: true })).toBeVisible();

  await page.goto("/courses/costa-rica-specialist");
  await page.getByRole("link", { name: /Continue learning/ }).click();
  await page.getByRole("button", { name: "Show syllabus" }).click();
  await expect(page.getByRole("dialog", { name: "Syllabus" })).toBeVisible();
});
